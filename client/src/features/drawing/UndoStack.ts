import { Graphics, Container } from 'pixi.js';

export class UndoStack {
  private strokes: Graphics[] = [];
  private container: Container;

  onChange: (() => void) | null = null;

  constructor(container: Container) {
    this.container = container;
  }

  push(gfx: Graphics): void {
    this.strokes.push(gfx);
    this.container.addChild(gfx);
    this.onChange?.();
  }

  undo(): boolean {
    const gfx = this.strokes.pop();
    if (!gfx) return false;
    this.container.removeChild(gfx);
    gfx.destroy();
    this.onChange?.();
    return true;
  }

  clear(): void {
    for (const gfx of this.strokes) {
      gfx.destroy();
    }
    this.strokes = [];
    this.container.removeChildren();
    this.onChange?.();
  }

  get isEmpty(): boolean {
    return this.strokes.length === 0;
  }
}
