import { Application, Container } from 'pixi.js';
import { EntityProfile } from '@crayon-world/shared/src/types';
import { captureEntityTexture } from './captureEntityTexture';
import { buildEntityContainer } from './EntitySprite';

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
  private _inWorld = false;

  constructor(app: Application) {
    this._drawingRoot = new Container();
    this._worldRoot = new Container();

    app.stage.addChild(this._drawingRoot);
    app.stage.addChild(this._worldRoot);

    // Start in draw mode — world is hidden
    this._worldRoot.visible = false;
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
  }
}
