import { Graphics, Container } from 'pixi.js';
import type { DrawTool } from './DrawingCanvas';

export class UndoStack {
  private strokes: Array<{ gfx: Graphics; tool: DrawTool }> = [];
  private container: Container;

  onChange: (() => void) | null = null;

  constructor(container: Container) {
    this.container = container;
  }

  push(gfx: Graphics, tool: DrawTool): void {
    this.strokes.push({ gfx, tool });
    this.container.addChild(gfx);
    this.onChange?.();
  }

  undo(): boolean {
    const stroke = this.strokes.pop();
    if (!stroke) return false;
    this.container.removeChild(stroke.gfx);
    stroke.gfx.destroy();
    this.onChange?.();
    return true;
  }

  clear(): void {
    for (const { gfx } of this.strokes) {
      gfx.destroy();
    }
    this.strokes = [];
    this.container.removeChildren();
    this.onChange?.();
  }

  get isEmpty(): boolean {
    return this.strokes.length === 0;
  }

  get hasBrushStroke(): boolean {
    return this.strokes.some((stroke) => stroke.tool === 'brush');
  }
}
