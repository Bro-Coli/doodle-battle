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

  private computeCanvasSize(screenWidth: number, screenHeight: number, leftReserved = 0): {
    width: number;
    height: number;
  } {
    const availableWidth = Math.max(screenWidth - leftReserved - 48, 360);
    const width = Math.max(Math.min(availableWidth * 0.72, 760), 600);
    const height = Math.max(Math.min(screenHeight * 0.6, 460), 360);
    return { width, height };
  }

  private updateRegionFrame(width: number, height: number): void {
    this._region.clear();
    this._region.roundRect(0, 0, width, height, 20).fill({ color: 0xffffff }).stroke({ color: 0xd0d0d0, width: 1 });
  }

  constructor(app: Application) {
    this.app = app;

    const { width: w, height: h } = this.computeCanvasSize(app.screen.width, app.screen.height);
    const x = (app.screen.width - w) / 2;
    const y = (app.screen.height - h) / 2 + 28;
    this._canvasBounds = { x, y, width: w, height: h };

    // Create drawing region as white-filled rectangle with subtle border
    this._region = new Graphics();
    this.updateRegionFrame(w, h);
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

    // Global pointer move updates live stroke.
    //
    // Keep strokes strictly inside the canvas: when the pointer leaves the
    // region we finalize the current segment instead of clamping points to
    // the border (which used to pile ink up along the edge). If the user
    // returns to the canvas while still holding the button, a fresh segment
    // is started so strokes don't jump across outside areas.
    app.stage.on('globalpointermove', (e) => {
      if (!this.drawing) return;

      const pos = e.getLocalPosition(this._region);
      const isInside =
        pos.x >= 0 && pos.x <= this._region.width && pos.y >= 0 && pos.y <= this._region.height;

      if (!isInside) {
        this.finalizeLiveSegment();
        return;
      }

      if (!this.liveGraphics) {
        this.liveGraphics = new Graphics();
        this.strokeContainer.addChild(this.liveGraphics);
        this.currentPoints = [];
      }

      this.currentPoints.push([pos.x, pos.y]);
      renderStroke(this.liveGraphics, this.currentPoints, this.activePreset);
    });

    // Pointer up commits any open segment and ends the drawing session.
    const commitStroke = () => {
      if (!this.drawing) return;
      this.drawing = false;
      this.finalizeLiveSegment();
    };

    app.stage.on('pointerup', commitStroke);
    app.stage.on('pointerupoutside', commitStroke);
    app.stage.eventMode = 'static';
  }

  /**
   * Commit the in-progress live stroke segment to the undo stack and clear
   * the live graphics. Does NOT change the `drawing` flag so callers can
   * decide whether the user is still actively drawing (e.g. pointer exited
   * the canvas but button is still held).
   */
  private finalizeLiveSegment(): void {
    if (!this.liveGraphics) {
      this.currentPoints = [];
      return;
    }

    this.strokeContainer.removeChild(this.liveGraphics);
    this.liveGraphics.destroy();
    this.liveGraphics = null;

    if (this.currentPoints.length === 0) return;

    let pts = this.currentPoints;
    if (pts.length < 2) {
      pts = [pts[0], pts[0]];
    }

    const committed = new Graphics();
    renderStroke(committed, pts, this.activePreset);
    this._undoStack.push(committed, this._activeTool);

    this.currentPoints = [];
  }

  undo(): void {
    this._undoStack.undo();
  }

  /**
   * Commit any in-progress stroke (e.g., when auto-submitting while user is still drawing).
   * If no stroke is in progress, this is a no-op.
   */
  commitCurrentStroke(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.finalizeLiveSegment();
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

  get hasBrushStroke(): boolean {
    return this._undoStack.hasBrushStroke;
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
    const { width: w, height: h } = this.computeCanvasSize(screenWidth, screenHeight, leftReserved);
    const x = (screenWidth - w) / 2;
    const y = (screenHeight - h) / 2 + 28;
    this.updateRegionFrame(w, h);
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
