import { Application, Container, Sprite, Text, TextStyle, Texture, Ticker } from 'pixi.js';
import { DropShadowFilter } from 'pixi-filters';
import { EntityProfile } from '@crayon-world/shared/src/types';
import { showTooltip, hideTooltip } from './EntityTooltip';

export interface EntityBuildResult {
  entity: Container;
  label: Container;
  spriteHeight: number;
}

/**
 * Build a scaled, drop-shadowed Sprite for an entity's drawing texture.
 * Shared between the initial container build and updateEntityTexture so
 * scale/filters stay consistent regardless of which path creates the sprite.
 */
export function buildEntitySprite(texture: Texture): Sprite {
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

  return sprite;
}

/** Hex tint values applied to entity sprites by team. */
export const TEAM_TINTS: Record<string, number> = {
  red: 0xff6666,
  blue: 0x6699ff,
};

/** CSS color values applied to entity label text by team. */
export const TEAM_LABEL_COLORS: Record<string, string> = {
  red: '#ff6666',
  blue: '#6699ff',
};

/**
 * Build an entity Container and a separate label Container from a texture and profile.
 *
 * The entity Container owns:
 *  - A Sprite scaled to ~1:5 of original size (minimum 30px on smallest dimension)
 *  - A DropShadowFilter on the sprite for depth
 *  - A fade-in animation over ~300ms
 *
 * The label Container is returned separately so it can be added as a sibling
 * in the world root — it follows the entity position but is never affected by
 * the entity's rotation or flip.
 *
 * @param texture - Transparent texture from captureEntityTexture
 * @param profile - Entity identity from the recognition pipeline
 * @param app - The PixiJS Application (needed for ticker)
 * @param teamId - Optional team identifier ('red' | 'blue') for color tinting
 * @returns Entity container, label container, and sprite height for positioning
 */
export function buildEntityContainer(
  texture: Texture,
  profile: EntityProfile,
  app: Application,
  teamId?: string,
): EntityBuildResult {
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
  const sprite = buildEntitySprite(texture);
  entity.addChild(sprite);

  // Floating name label — separate container, not a child of entity
  const label = new Container();
  const labelFill = (teamId && TEAM_LABEL_COLORS[teamId]) ? TEAM_LABEL_COLORS[teamId] : '#333333';
  const labelText = new Text({
    text: profile.name,
    style: new TextStyle({
      fontSize: 14,
      fill: labelFill,
      fontWeight: 'bold',
    }),
    resolution: window.devicePixelRatio || 2,
  });
  labelText.anchor.set(0.5, 1);
  label.addChild(labelText);

  const spriteHeight = sprite.height;

  // Fade-in over ~300ms using app.ticker — fade both entity and label together
  entity.alpha = 0;
  label.alpha = 0;
  let elapsed = 0;

  const fadeIn = (ticker: Ticker): void => {
    elapsed += ticker.deltaMS;
    const alpha = Math.min(1, elapsed / 300);
    entity.alpha = alpha;
    label.alpha = alpha;
    if (alpha >= 1) {
      app.ticker.remove(fadeIn);
    }
  };

  app.ticker.add(fadeIn);

  return { entity, label, spriteHeight };
}
