import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture, Ticker } from 'pixi.js';
import { DropShadowFilter } from 'pixi-filters';
import { EntityProfile } from '@crayon-world/shared/src/types';
import { showTooltip, hideTooltip } from './EntityTooltip';

export interface EntityBuildResult {
  entity: Container;
  label: Container;
  spriteHeight: number;
  healthBar: Graphics;
}

const HEALTH_BAR_HEIGHT = 7;

function createOwnerBadge(ownerName: string): Container {
  const badge = new Container();
  const text = new Text({
    text: ownerName,
    style: new TextStyle({
      fontSize: 12,
      fill: '#4A2A00',
      fontWeight: '900',
      letterSpacing: 1,
    }),
    resolution: window.devicePixelRatio || 2,
  });
  text.anchor.set(0.5, 0.5);

  const bounds = text.getLocalBounds();
  const padX = 10;
  const padY = 5;
  const width = Math.max(34, bounds.width + padX * 2);
  const height = Math.max(20, bounds.height + padY * 2);
  const bg = new Graphics();
  bg
    .roundRect(-width / 2, -height / 2, width, height, 7)
    .fill({ color: 0xffc93c });
  bg
    .roundRect(-width / 2, -height / 2, width, Math.max(10, height * 0.48), 7)
    .fill({ color: 0xffe788, alpha: 0.85 });
  bg
    .roundRect(-width / 2, height / 2 - Math.max(5, height * 0.28), width, Math.max(5, height * 0.28), 7)
    .fill({ color: 0xe08a00, alpha: 0.85 });
  bg
    .roundRect(-width / 2, -height / 2, width, height, 7)
    .stroke({ width: 1, color: 0x9b5f00, alpha: 0.55 });
  bg.filters = [new DropShadowFilter({ blur: 2, offset: { x: 0, y: 1 }, alpha: 0.25 })];

  badge.addChild(bg);
  badge.addChild(text);
  return badge;
}

/** Redraw a health bar for the given hp fraction (0..1). */
export function updateHealthBar(bar: Graphics, fraction: number): void {
  const width = (bar as unknown as { _barWidth: number })._barWidth;
  const clamped = Math.max(0, Math.min(1, fraction));
  const fillColor = clamped > 0.5 ? 0x4caf50 : clamped > 0.25 ? 0xffc107 : 0xf44336;
  bar.clear();
  bar
    .roundRect(-width / 2, 0, width, HEALTH_BAR_HEIGHT, 2)
    .fill({ color: 0x000000, alpha: 0.45 });
  if (clamped > 0) {
    bar
      .roundRect(-width / 2, 0, width * clamped, HEALTH_BAR_HEIGHT, 2)
      .fill({ color: fillColor });
  }
}

/**
 * Build a scaled, drop-shadowed Sprite for an entity's drawing texture.
 * Shared between the initial container build and updateEntityTexture so
 * scale/filters stay consistent regardless of which path creates the sprite.
 */
export function buildEntitySprite(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.5);

  // Scale down, clamping so minimum dimension is at least 52px
  const scaleFactor = 0.35;
  const scaledW = texture.width * scaleFactor;
  const scaledH = texture.height * scaleFactor;
  const minDim = Math.min(scaledW, scaledH);
  const finalScale = minDim < 52 ? scaleFactor * (52 / minDim) : scaleFactor;
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
  ownerName?: string,
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
  let nextY = 0;

  if (ownerName) {
    const ownerBadge = createOwnerBadge(ownerName);
    ownerBadge.y = nextY;
    label.addChild(ownerBadge);
    nextY += ownerBadge.height + 4;
  }

  const labelText = new Text({
    text: profile.name,
    style: new TextStyle({
      fontSize: 24,
      fill: labelFill,
      fontWeight: 'bold',
    }),
    resolution: window.devicePixelRatio || 2,
  });
  labelText.anchor.set(0.5, 0);
  labelText.y = nextY;
  label.addChild(labelText);

  // Health bar — sits just beneath the nametag, above the sprite
  const barWidth = Math.max(63, Math.min(140, sprite.width * 0.6));
  const healthBar = new Graphics();
  (healthBar as unknown as { _barWidth: number })._barWidth = barWidth;
  healthBar.y = labelText.y + labelText.height + 4;
  updateHealthBar(healthBar, 1);
  label.addChild(healthBar);

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

  return { entity, label, spriteHeight, healthBar };
}
