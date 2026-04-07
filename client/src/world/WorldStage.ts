import { Application, Container, Ticker, Texture } from 'pixi.js';
import { EntityProfile } from '@crayon-world/shared/src/types';
import { captureEntityTexture } from './captureEntityTexture';
import { buildEntityContainer, EntityBuildResult } from './EntitySprite';
import {
  EntityState,
  SpreadingState,
  initEntityState,
  dispatchBehavior,
} from './EntitySimulation';

/**
 * WorldStage manages the dual-container architecture: draw mode / world mode.
 *
 * - `drawingRoot` holds the drawing canvas region.
 * - `worldRoot` holds all spawned entity containers.
 *
 * Toggle between draw mode and world mode by calling `toggle()`.
 * Spawn entities from the stroke container via `spawnEntity()`.
 */
export class WorldStage {
  private readonly _drawingRoot: Container;
  private readonly _worldRoot: Container;
  private readonly _app: Application;
  private _inWorld = false;

  // Simulation state maps — keyed by entity container
  private readonly _entityStates = new Map<Container, EntityState>();
  private readonly _entityTextures = new Map<Container, Texture>();
  private readonly _entityProfiles = new Map<Container, EntityProfile>();
  private readonly _entityLabels = new Map<Container, Container>();
  private readonly _entitySpriteHeights = new Map<Container, number>();

  constructor(app: Application) {
    this._app = app;
    this._drawingRoot = new Container();
    this._worldRoot = new Container();

    app.stage.addChild(this._drawingRoot);
    app.stage.addChild(this._worldRoot);

    // Start in draw mode — world is hidden
    this._worldRoot.visible = false;

    // Register single shared ticker for all entity simulation
    app.ticker.add(this._gameTick);
  }

  get drawingRoot(): Container {
    return this._drawingRoot;
  }

  get worldRoot(): Container {
    return this._worldRoot;
  }

  get inWorld(): boolean {
    return this._inWorld;
  }

  /** Toggle between draw mode and world mode. */
  toggle(): void {
    this._inWorld = !this._inWorld;
    this._drawingRoot.visible = !this._inWorld;
    this._worldRoot.visible = this._inWorld;
  }

  /**
   * Capture the current drawing as a texture and spawn an entity in the world.
   *
   * @param app - The PixiJS Application
   * @param strokeContainer - Container holding committed strokes (must have children)
   * @param profile - Entity identity from the recognition pipeline
   */
  spawnEntity(app: Application, strokeContainer: Container, profile: EntityProfile): void {
    const texture = captureEntityTexture(app, strokeContainer);
    const { entity, label, spriteHeight } = buildEntityContainer(texture, profile, app);

    // Position randomly within canvas with 50px margin from edges
    const margin = 50;
    entity.x = margin + Math.random() * (app.screen.width - margin * 2);
    entity.y = margin + Math.random() * (app.screen.height - margin * 2);

    // Label is a sibling — not affected by entity rotation/flip
    label.x = entity.x;
    label.y = entity.y - spriteHeight / 2 - 6;

    this._worldRoot.addChild(entity);
    this._worldRoot.addChild(label);

    // Initialize simulation state for this entity
    const state = initEntityState(profile.archetype, profile.speed, entity.x, entity.y);
    this._entityStates.set(entity, state);
    this._entityTextures.set(entity, texture);
    this._entityProfiles.set(entity, profile);
    this._entityLabels.set(entity, label);
    this._entitySpriteHeights.set(entity, spriteHeight);
  }

  /**
   * Single shared game tick — drives all entity simulation.
   * Registered once in the constructor; iterates all entity states.
   */
  private readonly _gameTick = (ticker: Ticker): void => {
    const dt = ticker.deltaMS / 1000;
    const world = { width: this._app.screen.width, height: this._app.screen.height };

    for (const [container, state] of this._entityStates) {
      const newState = dispatchBehavior(state, dt, world);

      // Write position to container
      container.x = newState.x;
      container.y = newState.y;

      // Orientation for walking and flying — feet always face down.
      // Horizontal flip for left/right, tilt up to ±45° for vertical movement.
      if (newState.archetype === 'walking' || newState.archetype === 'flying') {
        if (Math.abs(newState.vx) > 0.01) {
          container.scale.x = newState.vx < 0 ? -Math.abs(container.scale.x) : Math.abs(container.scale.x);
        }
        const speed = Math.sqrt(newState.vx * newState.vx + newState.vy * newState.vy);
        if (speed > 0.01) {
          const tilt = Math.asin(Math.max(-1, Math.min(1, newState.vy / speed)));
          const maxTilt = Math.PI / 4; // 45 degrees
          container.rotation = Math.max(-maxTilt, Math.min(maxTilt, tilt));
        }
      }

      // Sync label position — label is a sibling, always upright
      const label = this._entityLabels.get(container);
      const spriteH = this._entitySpriteHeights.get(container);
      if (label && spriteH !== undefined) {
        label.x = newState.x;
        label.y = newState.y - spriteH / 2 - 6;
      }

      // Handle spreading copy spawn signal
      if (newState.archetype === 'spreading' && newState.pendingSpawn && !newState.isACopy) {
        this._spawnCopy(container, newState);
        newState.pendingSpawn = false; // reset after handling
      }

      this._entityStates.set(container, newState);
    }
  };

  /**
   * Spawn a copy of a spreading entity near its current position.
   * Copies have isACopy = true so they never spawn further copies.
   */
  private _spawnCopy(parentContainer: Container, parentState: SpreadingState): void {
    const texture = this._entityTextures.get(parentContainer);
    const profile = this._entityProfiles.get(parentContainer);
    if (!texture || !profile) return;

    // Spawn near parent within spawnRadius
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * parentState.spawnRadius;
    const copyX = parentState.x + Math.cos(angle) * dist;
    const copyY = parentState.y + Math.sin(angle) * dist;

    // Build a copy using existing buildEntityContainer
    const { entity: copyContainer, label: copyLabel, spriteHeight: copySpriteH } = buildEntityContainer(texture, profile, this._app);
    copyContainer.x = copyX;
    copyContainer.y = copyY;
    copyLabel.x = copyX;
    copyLabel.y = copyY - copySpriteH / 2 - 6;

    // Initialize state as a copy (isACopy = true, so it never spawns further)
    const copyState = initEntityState(profile.archetype, profile.speed, copyX, copyY);
    if (copyState.archetype === 'spreading') {
      (copyState as SpreadingState).isACopy = true;
    }

    this._worldRoot.addChild(copyContainer);
    this._worldRoot.addChild(copyLabel);
    this._entityStates.set(copyContainer, copyState);
    this._entityTextures.set(copyContainer, texture);
    this._entityProfiles.set(copyContainer, profile);
    this._entityLabels.set(copyContainer, copyLabel);
    this._entitySpriteHeights.set(copyContainer, copySpriteH);
  }
}
