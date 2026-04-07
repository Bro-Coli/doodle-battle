import { Application, Container, Ticker, Texture } from 'pixi.js';
import { EntityProfile } from '@crayon-world/shared/src/types';
import { captureEntityTexture } from './captureEntityTexture';
import { buildEntityContainer } from './EntitySprite';
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
    const entityContainer = buildEntityContainer(texture, profile, app);

    // Position randomly within canvas with 50px margin from edges
    const margin = 50;
    entityContainer.x = margin + Math.random() * (app.screen.width - margin * 2);
    entityContainer.y = margin + Math.random() * (app.screen.height - margin * 2);

    this._worldRoot.addChild(entityContainer);

    // Initialize simulation state for this entity
    const state = initEntityState(profile.archetype, profile.speed, entityContainer.x, entityContainer.y);
    this._entityStates.set(entityContainer, state);
    this._entityTextures.set(entityContainer, texture);
    this._entityProfiles.set(entityContainer, profile);
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

      // Rotation for walking and flying (face movement direction)
      if (newState.archetype === 'walking' || newState.archetype === 'flying') {
        if (Math.abs(newState.vx) > 0.01 || Math.abs(newState.vy) > 0.01) {
          container.rotation = Math.atan2(newState.vy, newState.vx);
        }
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

    // Build a copy container using existing buildEntityContainer
    const copyContainer = buildEntityContainer(texture, profile, this._app);
    copyContainer.x = copyX;
    copyContainer.y = copyY;

    // Initialize state as a copy (isACopy = true, so it never spawns further)
    const copyState = initEntityState(profile.archetype, profile.speed, copyX, copyY);
    if (copyState.archetype === 'spreading') {
      (copyState as SpreadingState).isACopy = true;
    }

    this._worldRoot.addChild(copyContainer);
    this._entityStates.set(copyContainer, copyState);
    this._entityTextures.set(copyContainer, texture);
    this._entityProfiles.set(copyContainer, profile);
  }
}
