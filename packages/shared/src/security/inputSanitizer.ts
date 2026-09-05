export class InputSanitizer {
  /**
   * Sanitizes string by stripping dangerous HTML tags, javascript pseudo-protocols,
   * inline event handlers, and normalizing unicode.
   */
  static sanitizeString(input?: string | null): string {
    if (!input) return "";

    // Normalize Unicode to NFC
    let clean = input.normalize("NFC");

    // Remove script tags and contents
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    // Remove iframe, embed, object tags
    clean = clean.replace(/<(iframe|embed|object|base|link|meta)\b[^>]*>/gi, "");

    // Remove javascript: and data: pseudo protocols
    clean = clean.replace(/javascript:[^"'\s]*/gi, "");
    clean = clean.replace(/data:text\/html[^"'\s]*/gi, "");

    // Remove inline event handlers (onerror=, onload=, onclick=, etc.)
    clean = clean.replace(/\son[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

    // Encode residual angle brackets for pure text fields
    clean = clean.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    return clean.trim();
  }

  /**
   * Sanitizes plain text while preserving harmless line breaks.
   */
  static sanitizePlainText(text?: string | null, maxLength: number = 5000): string {
    if (!text) return "";
    const sanitized = this.sanitizeString(text);
    return sanitized.slice(0, maxLength);
  }

  /**
   * Validates and isolates raw data strings (such as runner outputs) ensuring
   * they cannot execute as HTML or scripts when displayed in the frontend.
   */
  static isolateRawContent(raw: string): string {
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }
}
