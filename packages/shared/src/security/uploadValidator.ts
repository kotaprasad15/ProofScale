import crypto from "node:crypto";
import path from "node:path";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  objectKey?: string;
  detectedMimeType?: string;
}

export class UploadValidator {
  public static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  // Allowed file extensions whitelist
  public static readonly ALLOWED_EXTENSIONS = new Set([
    ".json",
    ".csv",
    ".log",
    ".txt",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg"
  ]);

  // Prohibited executable extensions
  public static readonly BLOCKED_EXTENSIONS = new Set([
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".bash",
    ".bin",
    ".elf",
    ".so",
    ".dll",
    ".ps1",
    ".vbs",
    ".js",
    ".mjs",
    ".ts",
    ".py",
    ".php",
    ".rb",
    ".html",
    ".htm",
    ".svg",
    ".xml",
    ".jsp",
    ".asp",
    ".aspx"
  ]);

  // Magic bytes / signatures
  private static readonly MAGIC_BYTES: Record<string, { bytes: number[]; mime: string }> = {
    png: { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: "image/png" },
    jpeg: { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
    pdf: { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" } // "%PDF"
  };

  // Executable signatures to reject regardless of extension
  private static readonly EXECUTABLE_SIGNATURES = [
    { name: "DOS/PE Executable", bytes: [0x4d, 0x5a] }, // "MZ"
    { name: "ELF Executable", bytes: [0x7f, 0x45, 0x4c, 0x46] }, // "\x7FELF"
    { name: "Java Class / Mach-O", bytes: [0xca, 0xfe, 0xba, 0xbe] },
    { name: "Mach-O 64-bit", bytes: [0xcf, 0xfa, 0xed, 0xfe] },
    { name: "Shell Script Shebang", bytes: [0x23, 0x21] } // "#!"
  ];

  /**
   * Validates an uploaded file buffer, filename, and stated MIME type.
   */
  static validateUpload(
    buffer: Buffer,
    originalFilename: string,
    claimedMimeType?: string,
    maxSizeBytes: number = this.MAX_FILE_SIZE_BYTES
  ): FileValidationResult {
    // 1. Check size limit
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: "Empty file payload is rejected." };
    }
    if (buffer.length > maxSizeBytes) {
      return {
        valid: false,
        error: `File size (${buffer.length} bytes) exceeds maximum allowable limit (${maxSizeBytes} bytes).`
      };
    }

    // 2. Validate file extension against whitelist
    const ext = path.extname(originalFilename).toLowerCase();
    if (!ext || !this.ALLOWED_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `File extension '${ext}' is not permitted. Allowed: ${Array.from(this.ALLOWED_EXTENSIONS).join(", ")}`
      };
    }

    // 3. Reject known dangerous / executable extensions explicitly
    if (this.BLOCKED_EXTENSIONS.has(ext)) {
      return { valid: false, error: `Executable or script extension '${ext}' is strictly prohibited.` };
    }

    // 4. Inspect magic bytes for executable headers
    for (const sig of this.EXECUTABLE_SIGNATURES) {
      if (this.bufferStartsWith(buffer, sig.bytes)) {
        return {
          valid: false,
          error: `File payload matches prohibited binary signature: ${sig.name}.`
        };
      }
    }

    // 5. Verify format-specific magic bytes
    let detectedMime = claimedMimeType || "application/octet-stream";
    if (ext === ".png") {
      if (!this.bufferStartsWith(buffer, this.MAGIC_BYTES.png.bytes)) {
        return { valid: false, error: "PNG magic byte signature verification failed." };
      }
      detectedMime = "image/png";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      if (!this.bufferStartsWith(buffer, this.MAGIC_BYTES.jpeg.bytes)) {
        return { valid: false, error: "JPEG magic byte signature verification failed." };
      }
      detectedMime = "image/jpeg";
    } else if (ext === ".pdf") {
      if (!this.bufferStartsWith(buffer, this.MAGIC_BYTES.pdf.bytes)) {
        return { valid: false, error: "PDF magic byte signature verification failed." };
      }
      detectedMime = "application/pdf";
    } else if (ext === ".json") {
      // Validate JSON content
      try {
        JSON.parse(buffer.toString("utf8"));
        detectedMime = "application/json";
      } catch {
        return { valid: false, error: "JSON content parse verification failed." };
      }
    } else if (ext === ".txt" || ext === ".log" || ext === ".csv") {
      // Reject binary null bytes in plain text files
      for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
        if (buffer[i] === 0x00) {
          return { valid: false, error: "Plain text file contains illegal null bytes." };
        }
      }
      detectedMime = ext === ".csv" ? "text/csv" : "text/plain";
    }

    // 6. Generate randomized stored object key (UUID + clean extension)
    // Never use user-supplied filename directly to prevent directory traversal or name collisions
    const randomId = crypto.randomUUID();
    const safeObjectKey = `uploads/${Date.now()}_${randomId}${ext}`;
    const sanitizedFilename = `${randomId}${ext}`;

    return {
      valid: true,
      sanitizedFilename,
      objectKey: safeObjectKey,
      detectedMimeType: detectedMime
    };
  }

  private static bufferStartsWith(buffer: Buffer, expected: number[]): boolean {
    if (buffer.length < expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) return false;
    }
    return true;
  }
}
