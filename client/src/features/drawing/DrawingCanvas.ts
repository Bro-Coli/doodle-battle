import { Application, Graphics, Container } from 'pixi.js';
import { renderStroke, setStrokeColor, ThicknessPreset } from './StrokeRenderer';
import { UndoStack } from './UndoStack';

export type DrawTool = 'brush' | 'eraser';

export class DrawingCanvas {
  private app: Application;
  private _region: Graphics;
  private strokeContainer: Container;
  private _undoStack: UndoStack;
  private _canvasBounds: { x: number; y: number; width: number; height: number };

  private currentPoints: [number, number][] = [];
  private liveGraphics: Graphics | null = null;
  private drawing = false;
  private activePreset: ThicknessPreset = 'medium';
  private _activeTool: DrawTool = 'brush';
  private _brushColor = 0x000000;
  onToolChange: ((tool: DrawTool) => void) | null = null;

  constructor(app: Application) {
    this.app = app;

    const w = Math.min(app.screen.width * 0.7, 680);
    const h = Math.min(app.screen.height * 0.75, 560);
    const x = (app.screen.width - w) / 2;
    const y = (app.screen.height - h) / 2 + 28;
    this._canvasBounds = { x, y, width: w, height: h };

    // Create drawing region as white-filled rectangle with subtle border
    this._region = new Graphics();
    this._region.roundRect(0, 0, w, h, 20).fill({ color: 0xffffff }).stroke({ color: 0xd0d0d0, width: 1 });
    this._region.x = x;
    this._region.y = y;
    this._region.eventMode = 'static';
    this._region.cursor = 'crosshair';

    // Container for committed strokes
    this.strokeContainer = new Container();
    this._region.addChild(this.strokeContainer);

    this._undoStack = new UndoStack(this.strokeContainer);

    this._region.on('pointerdown', (e) => {
      if (this.drawing) return;
      this.drawing = true;
      this.currentPoints = [];

      if (this._activeTool === 'eraser') {
        setStrokeColor(0xffffff);
      } else {
        setStrokeColor(this._brushColor);
      }

      this.liveGraphics = new Graphics();
      this.strokeContainer.addChild(this.liveGraphics);

      const pos = e.getLocalPosition(this._region);
      this.currentPoints.push([pos.x, pos.y]);
    });

    // Global pointer move updates live stroke
    app.stage.on('globalpointermove', (e) => {
      if (!this.drawing || !this.liveGraphics) return;

      const pos = e.getLocalPosition(this._region);

      // Clamp to region bounds
      const clampedX = Math.max(0, Math.min(this._region.width, pos.x));
      const clampedY = Math.max(0, Math.min(this._region.height, pos.y));

      this.currentPoints.push([clampedX, clampedY]);
      renderStroke(this.liveGraphics, this.currentPoints, this.activePreset);
    });

    // Pointer up commits the stroke
    const commitStroke = () => {
      if (!this.drawing) return;
      this.drawing = false;

      // Remove live graphics from container (will be replaced by committed one)
      if (this.liveGraphics) {
        this.strokeContainer.removeChild(this.liveGraphics);
        this.liveGraphics.destroy();
        this.liveGraphics = null;
      }

      // Need at least 1 point to commit
      if (this.currentPoints.length === 0) return;

      // If just a click (< 2 points), duplicate the point to render a dot
      let pts = this.currentPoints;
      if (pts.length < 2) {
        pts = [pts[0], pts[0]];
      }

      const committed = new Graphics();
      renderStroke(committed, pts, this.activePreset);
      this._undoStack.push(committed);

      this.currentPoints = [];
    };

    app.stage.on('pointerup', commitStroke);
    app.stage.on('pointerupoutside', commitStroke);
    app.stage.eventMode = 'static';
  }

  undo(): void {
    this._undoStack.undo();
  }

  /**
   * Commit any in-progress stroke (e.g., when auto-submitting while user is still drawing).
   * If no stroke is in progress, this is a no-op.
   */
  commitCurrentStroke(): void {
    if (!this.drawing || !this.liveGraphics) return;

    this.drawing = false;

    // Remove live graphics from container (will be replaced by committed one)
    this.strokeContainer.removeChild(this.liveGraphics);
    this.liveGraphics.destroy();
    this.liveGraphics = null;

    // Need at least 1 point to commit
    if (this.currentPoints.length === 0) return;

    // If just a click (< 2 points), duplicate the point to render a dot
    let pts = this.currentPoints;
    if (pts.length < 2) {
      pts = [pts[0], pts[0]];
    }

    const committed = new Graphics();
    renderStroke(committed, pts, this.activePreset);
    this._undoStack.push(committed);

    this.currentPoints = [];
  }

  clear(): void {
    this._undoStack.clear();

    // Defensive reset: if a pointerup was ever missed (e.g. user held through
    // an auto-submit, or released on an HTML overlay that swallowed the event),
    // `drawing` would stay true and the next round's pointerdown would bail at
    // `if (this.drawing) return;`. Clearing between rounds makes that unrecoverable
    // state self-healing.
    this.drawing = false;
    this.currentPoints = [];
    if (this.liveGraphics) {
      this.strokeContainer.removeChild(this.liveGraphics);
      this.liveGraphics.destroy();
      this.liveGraphics = null;
    }
  }

  get isEmpty(): boolean {
    return this._undoStack.isEmpty;
  }

  setThickness(preset: ThicknessPreset): void {
    this.activePreset = preset;
  }

  setTool(tool: DrawTool): void {
    this._activeTool = tool;
    this._region.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    this.onToolChange?.(tool);
  }

  get activeTool(): DrawTool {
    return this._activeTool;
  }

  setBrushColor(color: number): void {
    this._brushColor = color;
    if (this._activeTool === 'brush') {
      setStrokeColor(color);
    }
  }

  get undoStack(): UndoStack {
    return this._undoStack;
  }

  reposition(screenWidth: number, screenHeight: number, leftReserved = 0): void {
    const w = this._canvasBounds.width;
    const h = this._canvasBounds.height;
    const x = (screenWidth - w + leftReserved) / 2;
    const y = (screenHeight - h) / 2 + 28;
    this._region.x = x;
    this._region.y = y;
    this._canvasBounds = { x, y, width: w, height: h };
  }

  get canvasBounds(): { x: number; y: number; width: number; height: number } {
    return this._canvasBounds;
  }

  get region(): Graphics {
    return this._region;
  }

  get strokeContainerRef(): Container {
    return this.strokeContainer;
  }
}
