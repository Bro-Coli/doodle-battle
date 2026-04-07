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
  const bounds = strokeContainer.getBounds();

  const frame = new Rectangle(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );

  const texture = app.renderer.generateTexture({
    target: strokeContainer,
    frame,
    resolution: 1,
    antialias: true,
    clearColor: [0, 0, 0, 0],
  });

  return texture;
}
