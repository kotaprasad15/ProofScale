import * as THREE from "three";

/**
 * Samples pixel positions of a given text rendered to an offscreen 2D canvas
 * and normalizes them into 3D world-space coordinates centered at (0,0,0).
 */
export function generateLetterTargets(
  count: number,
  text: string = "RATECAP",
  worldWidth: number = 7.2,
  worldHeight: number = 1.85
): Float32Array {
  const targetPositions = new Float32Array(count * 3);

  if (typeof document === "undefined") {
    return targetPositions;
  }

  const canvasWidth = 1400;
  const canvasHeight = 360;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return targetPositions;
  }

  // Clear background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Configure high-contrast typography with Space Grotesk
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 170px "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  // Measure and draw text in center of canvas
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  ctx.fillText(text, centerX, centerY);

  // Extract pixel raster
  const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imgData.data;

  const filledPixels: { x: number; y: number }[] = [];
  const step = 4; // Sample every 4 pixels for high density resolution

  for (let y = 0; y < canvasHeight; y += step) {
    for (let x = 0; x < canvasWidth; x += step) {
      const idx = (y * canvasWidth + x) * 4;
      const red = data[idx];
      // Pixel is filled if text was rendered here
      if (red > 120) {
        filledPixels.push({ x, y });
      }
    }
  }

  if (filledPixels.length === 0) {
    return targetPositions;
  }

  // Fisher-Yates shuffle so particles arrive uniformly at letters instead of strictly left-to-right
  for (let i = filledPixels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = filledPixels[i];
    filledPixels[i] = filledPixels[j];
    filledPixels[j] = temp;
  }

  // Project filled pixel points into 3D world space centered at origin
  for (let i = 0; i < count; i++) {
    const pixel = filledPixels[i % filledPixels.length];
    
    // Slight jitter to create organic volume and avoid rigid grid aliasing
    const jitterX = (Math.random() - 0.5) * (step / canvasWidth) * worldWidth * 0.8;
    const jitterY = (Math.random() - 0.5) * (step / canvasHeight) * worldHeight * 0.8;
    const jitterZ = (Math.random() - 0.5) * 0.35; // Subtle 3D thickness

    const normX = (pixel.x / canvasWidth - 0.5) * worldWidth + jitterX;
    const normY = -(pixel.y / canvasHeight - 0.5) * worldHeight + jitterY;
    const normZ = jitterZ;

    targetPositions[i * 3] = normX;
    targetPositions[i * 3 + 1] = normY;
    targetPositions[i * 3 + 2] = normZ;
  }

  return targetPositions;
}
