import { Application, Container, Graphics, Rectangle } from 'pixi.js';

/**
 * Export the current drawing as a cropped PNG data URL.
 *
 * Computes the bounding box of all committed strokes, expands it by `padding`
 * pixels, clamps to the drawing region's world bounds, and extracts a canvas
 * at resolution 1 (avoids high-DPI bloat — Pitfall 4 from research).
 *
 * @param app - The PixiJS Application
 * @param strokeContainer - Container holding all committed stroke Graphics
 * @param region - The drawing region Graphics (used to clamp the export frame)
 * @param padding - Pixels of whitespace to add around the content bounding box
 * @returns A PNG data URL string, or null if the canvas is empty
 */
export function exportPng(
  app: Application,
  strokeContainer: Container,
  region: Graphics,
  padding = 16,
): string | null {
  // Safety guard: nothing to export if no strokes
  if (strokeContainer.children.length === 0) {
    return null;
  }

  // Tight bounding box around all stroke content (world coordinates)
  const strokeBounds = strokeContainer.getBounds();

  // Expand by padding on all sides
  const padded = new Rectangle(
    strokeBounds.x - padding,
    strokeBounds.y - padding,
    strokeBounds.width + padding * 2,
    strokeBounds.height + padding * 2,
  );

  // Clamp frame to the drawing region's world bounds so export never exceeds
  // the visible drawing area
  const regionBounds = region.getBounds();
  const clampedX = Math.max(padded.x, regionBounds.x);
  const clampedY = Math.max(padded.y, regionBounds.y);
  const clampedRight = Math.min(padded.right, regionBounds.right);
  const clampedBottom = Math.min(padded.bottom, regionBounds.bottom);

  const frame = new Rectangle(
    clampedX,
    clampedY,
    clampedRight - clampedX,
    clampedBottom - clampedY,
  );

  // Extract canvas at resolution 1 to keep file size reasonable for API calls
  const extracted = app.renderer.extract.canvas({
    target: app.stage,
    frame,
    resolution: 1,
    clearColor: '#ffffff',
  });

  return (extracted as HTMLCanvasElement).toDataURL('image/png');
}
