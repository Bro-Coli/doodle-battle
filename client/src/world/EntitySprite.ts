import { Application, Container, Sprite, Text, TextStyle, Texture, Ticker } from 'pixi.js';
import { DropShadowFilter } from 'pixi-filters';
import { EntityProfile } from '@crayon-world/shared/src/types';
import { showTooltip, hideTooltip } from './EntityTooltip';

/**
 * Build an entity Container from a texture and profile.
 *
 * The returned Container owns:
 *  - A Sprite scaled to ~1:5 of original size (minimum 30px on smallest dimension)
 *  - A DropShadowFilter on the sprite for depth
 *  - A floating name label above the sprite
 *  - A fade-in animation over ~300ms
 *
 * @param texture - Transparent texture from captureEntityTexture
 * @param profile - Entity identity from the recognition pipeline
 * @param app - The PixiJS Application (needed for ticker)
 * @returns A Container ready to be added to the world
 */
export function buildEntityContainer(
  texture: Texture,
  profile: EntityProfile,
  app: Application,
): Container {
  const entity = new Container();
  entity.eventMode = 'static';
  entity.cursor = 'pointer';

  // Wire hover events so the tooltip follows the cursor within entity bounds
  entity.on('pointerover', (e) => {
    const canvasBounds = app.canvas.getBoundingClientRect();
    showTooltip(profile, e.global.x + canvasBounds.left, e.global.y + canvasBounds.top);
  });
  entity.on('pointermove', (e) => {
    const canvasBounds = app.canvas.getBoundingClientRect();
    showTooltip(profile, e.global.x + canvasBounds.left, e.global.y + canvasBounds.top);
  });
  entity.on('pointerout', () => hideTooltip());

  // Create sprite from texture
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.5);

  // Scale down to ~1:5, clamping so minimum dimension is at least 30px
  const scaleFactor = 0.2;
  const scaledW = texture.width * scaleFactor;
  const scaledH = texture.height * scaleFactor;
  const minDim = Math.min(scaledW, scaledH);
  const finalScale = minDim < 30 ? scaleFactor * (30 / minDim) : scaleFactor;
  sprite.scale.set(finalScale);

  // Drop shadow filter — pixi-filters v6 uses `offset` (PointData), not `distance`
  sprite.filters = [new DropShadowFilter({ blur: 3, offset: { x: 4, y: 6 }, alpha: 0.35 })];

  entity.addChild(sprite);

  // Floating name label — positioned above the scaled sprite
  const label = new Text({
    text: profile.name,
    style: new TextStyle({
      fontSize: 12,
      fill: '#333333',
      fontWeight: 'bold',
    }),
  });
  label.anchor.set(0.5, 1);
  // sprite.height reflects the scale in v8
  label.y = -(sprite.height / 2) - 6;

  entity.addChild(label);

  // Fade-in over ~300ms using app.ticker
  entity.alpha = 0;
  let elapsed = 0;

  const fadeIn = (ticker: Ticker): void => {
    elapsed += ticker.deltaMS;
    entity.alpha = Math.min(1, elapsed / 300);
    if (entity.alpha >= 1) {
      app.ticker.remove(fadeIn);
    }
  };

  app.ticker.add(fadeIn);

  return entity;
}
