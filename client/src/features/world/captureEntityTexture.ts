import { Application, Container, Rectangle, Texture } from 'pixi.js';

/**
 * Capture the current drawing strokes as a transparent-background texture.
 *
 * Uses generateTexture with clearColor [0,0,0,0] so the resulting texture has
 * no white rectangle — only the drawn lines.
 *
 * @param app - The PixiJS Application
 * @param strokeContainer - Container holding all committed stroke Graphics
 * @returns A RenderTexture with transparent background cropped to stroke bounds
 */
export function captureEntityTexture(app: Application, strokeContainer: Container): Texture {
  // Use getLocalBounds — generateTexture renders in the target's local space,
  // so global getBounds() produces a misaligned frame (captures empty area).
  const bounds = strokeContainer.getLocalBounds();

  if (bounds.width === 0 || bounds.height === 0) {
    // Nothing drawn — return empty texture
    return Texture.EMPTY;
  }

  const texture = app.renderer.generateTexture({
    target: strokeContainer,
    frame: new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height),
    resolution: 2,
    antialias: true,
    clearColor: [0, 0, 0, 0],
  });

  return texture;
}
