# Phase 2: Drawing Canvas - Research

**Researched:** 2026-04-07
**Domain:** PixiJS v8 freehand drawing, stroke rendering, undo/clear, PNG export
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Black only — no color picker (color deferred to polish phase)
- 2-3 preset thickness sizes (thin/medium/thick toggle in toolbar)
- Smooth, tapered stroke ends — thinner at start/end, like a real pen
- Moderate curve smoothing — smooth out jitters but keep intentional curves
- Mouse-first optimization; touch works as fallback but not the priority
- Bounded drawing region — centered card/frame with subtle border or shadow, like drawing on a piece of paper
- Toolbar and UI live outside the drawing region
- Crosshair cursor inside the drawing area
- Full undo stack — undo removes strokes one at a time, can undo back to blank canvas
- Ctrl+Z keyboard shortcut for undo; no shortcut for clear (button only)
- Instant clear — no confirmation dialog
- Submit clears the canvas automatically after export, ready for next drawing
- White background included in PNG (black on white, matches screen)
- Crop to drawing content bounding box with padding
- Submit button disabled when canvas is empty (no strokes) — prevents blank submissions

### Claude's Discretion
- Max resolution cap for exported PNG (balance detail vs API cost)
- Exact stroke smoothing algorithm
- Exact padding amount around cropped content
- Drawing region dimensions and responsive behavior
- Thickness preset values (exact pixel sizes)
- Toolbar layout for thickness toggle

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DRAW-01 | Player can draw freehand on a canvas with mouse or touch input | PixiJS v8 globalPointermove + pointerdown/up on stage container |
| DRAW-02 | Strokes render in real-time with smooth, tapered appearance | `perfect-freehand` library produces tapered polygon outlines; PixiJS v8 Graphics poly fill renders them |
| DRAW-03 | Player can clear the entire drawing canvas | Remove all stroke Graphics children from drawing container, reset undo stack |
| DRAW-04 | Player can undo the last stroke | Maintain stroke array; pop last, remove corresponding Graphics child |
</phase_requirements>

---

## Summary

Phase 2 adds freehand drawing on top of the existing PixiJS v8 scaffolding. The core loop is: collect pointer events → accumulate raw points per stroke → render live using PixiJS Graphics → on pointer-up, commit stroke to undo stack. Smooth tapered appearance is achieved by passing raw points through `perfect-freehand` (npm package), which outputs a polygon outline that PixiJS can fill. This avoids hand-rolling pressure simulation and tapering math.

The drawing region is a PixiJS `Graphics` rectangle (white fill, drop-shadow filter or border) centered on the stage, with pointer events captured on the region. PNG export uses `app.renderer.extract.canvas()` scoped to a `Rectangle` that tightly bounds all stroke content, then converts to a data URL. The existing HTML toolbar gains a thickness toggle and proper enable/disable logic wired to stroke count.

**Primary recommendation:** Use `perfect-freehand` for stroke geometry, PixiJS v8 Graphics `poly()` + `fill()` for rendering, and `app.renderer.extract.canvas()` with a computed bounding `Rectangle` for cropped PNG export.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | ^8.16.0 (already installed) | Rendering strokes as filled polygons, PNG extraction | Project baseline; v8 Graphics API is the draw surface |
| perfect-freehand | ^1.2.0 | Convert raw pointer points to smooth tapered polygon outlines | Purpose-built for this exact problem; handles pressure simulation, smoothing, tapering in ~3 kB |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new needed) | — | — | All other needs met by PixiJS built-ins and the HTML overlay pattern already in place |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| perfect-freehand | Hand-rolled Catmull-Rom spline + variable-width line | perfect-freehand is battle-tested, < 4 kB, and produces better tapers; hand-rolling costs a full plan |
| perfect-freehand | lazy-brush | lazy-brush smooths coordinates but does not produce tapered polygon outlines; wrong tool |
| PixiJS Graphics poly fill | Canvas 2D overlay on top of PixiJS | Mixing two render surfaces adds z-index complexity and breaks renderer.extract for PNG |

**Installation:**
```bash
pnpm --filter @crayon-world/client add perfect-freehand
```

---

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── drawing/
│   ├── DrawingCanvas.ts    # drawing region setup, pointer event handlers, stroke lifecycle
│   ├── StrokeRenderer.ts   # converts perfect-freehand points to PixiJS Graphics polygon
│   ├── UndoStack.ts        # typed stack: push/pop/clear, emits change events
│   └── exportPng.ts        # bounding box computation + renderer.extract call
├── main.ts                 # wires DrawingCanvas + toolbar buttons + keyboard shortcuts
└── style.css               # add: drawing-region styles, crosshair cursor, active button styles
```

### Pattern 1: Pointer Event Capture on a Bounded Container

**What:** Attach pointer events to a PixiJS `Graphics` node that represents the drawing region. Use PixiJS v8's `globalpointermove` on the stage (not `pointermove`) so moves outside the region boundary still extend the current stroke.

**When to use:** Any time the drawing surface has edges but strokes should complete cleanly when the pointer leaves.

**Example:**
```typescript
// Source: https://pixijs.com/8.x/guides/components/events
import { Application, Graphics } from 'pixi.js';

const drawingRegion = new Graphics();
drawingRegion.rect(0, 0, regionW, regionH).fill(0xffffff);
drawingRegion.eventMode = 'static';
drawingRegion.cursor = 'crosshair';
app.stage.addChild(drawingRegion);

drawingRegion.on('pointerdown', onPointerDown);
app.stage.on('globalpointermove', onPointerMove);  // fires everywhere, not just on region
app.stage.on('pointerup', onPointerUp);
app.stage.on('pointerupoutside', onPointerUp);     // handle release outside window
```

### Pattern 2: Live Stroke with perfect-freehand + PixiJS Graphics

**What:** On each `pointermove`, append point to current stroke buffer, call `getStroke()`, redraw a single live `Graphics` object. On `pointerup`, commit the final `Graphics` to the undo stack and create a fresh live `Graphics` for the next stroke.

**When to use:** Every drawing application with smooth tapered strokes.

**Example:**
```typescript
// Source: https://github.com/steveruizok/perfect-freehand + https://observablehq.com/@ngimbal/pixi-js-x-perfect-freehand
import { getStroke } from 'perfect-freehand';
import { Graphics } from 'pixi.js';

const STROKE_OPTIONS = {
  size: 6,          // medium preset
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.4,
  simulatePressure: true,
};

function renderStroke(gfx: Graphics, points: [number, number][]): void {
  const outline = getStroke(points, STROKE_OPTIONS);
  if (outline.length < 2) return;

  gfx.clear();
  gfx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    gfx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  gfx.fill({ color: 0x000000 });
}
```

### Pattern 3: Undo Stack with Graphics Objects

**What:** Store committed stroke Graphics in a typed array. Undo pops the last element and removes it from the drawing container. Clear empties the array and removes all children.

**When to use:** Any per-stroke undo system in PixiJS.

**Example:**
```typescript
// Pure TypeScript, no external source needed
class UndoStack {
  private strokes: Graphics[] = [];
  private container: Container;

  constructor(container: Container) { this.container = container; }

  push(gfx: Graphics): void {
    this.strokes.push(gfx);
    this.container.addChild(gfx);
  }

  undo(): boolean {
    const gfx = this.strokes.pop();
    if (!gfx) return false;
    this.container.removeChild(gfx);
    gfx.destroy();
    return true;
  }

  clear(): void {
    for (const gfx of this.strokes) { gfx.destroy(); }
    this.strokes = [];
    this.container.removeAllChildren();
  }

  get isEmpty(): boolean { return this.strokes.length === 0; }
}
```

### Pattern 4: Cropped PNG Export

**What:** Compute the bounding box of all stroke Graphics, pad it, clamp to drawing region, then use `renderer.extract.canvas()` with a `Rectangle` frame. Convert canvas to data URL for the POST payload.

**When to use:** Phase 2 "submit" path and eventually Phase 3 API call.

**Example:**
```typescript
// Source: https://pixijs.download/dev/docs/rendering.ExtractSystem.html
import { Rectangle } from 'pixi.js';

function exportPng(app: Application, strokeContainer: Container, padding = 16): string {
  const bounds = strokeContainer.getBounds();        // tight bounding box around all strokes
  const frame = new Rectangle(
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2,
  );
  const canvas = app.renderer.extract.canvas({
    target: app.stage,
    frame,
  });
  return (canvas as HTMLCanvasElement).toDataURL('image/png');
}
```

### Anti-Patterns to Avoid

- **Attaching `pointermove` to the drawing region object instead of `globalpointermove` on the stage:** Strokes stop updating as soon as the pointer exits the region boundary mid-draw.
- **Re-creating a Graphics object on every pointermove frame:** Creates thousands of objects; always `clear()` and redraw the single live Graphics instance.
- **Storing raw points only (no Graphics references):** Makes undo require replaying all strokes from scratch. Store the committed Graphics objects directly.
- **Using PixiJS `lineStyle` (v7 API) in v8:** The v8 API uses `.stroke({ color, width })` called after building the path. The old API may still work but is not idiomatic in v8.
- **Extracting the entire stage for PNG without a frame:** Sends the full viewport to the AI, wasting resolution budget and API tokens.
- **Drawing PixiJS Graphics on top of an HTML canvas overlay:** Breaks `renderer.extract` — the PixiJS renderer only captures what is in the PixiJS scene graph.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tapered stroke appearance | Custom pressure simulation, variable-width spline math | `perfect-freehand` getStroke() | Handles start/end tapering, velocity-based pressure, streamlining — weeks of math in 3 kB |
| Stroke point smoothing | Moving average filter, Catmull-Rom from scratch | `perfect-freehand` streamline option | Built into the same function call |
| PNG extraction with region crop | Manual canvas drawImage() with pixel walks | `app.renderer.extract.canvas({ target, frame: Rectangle })` | PixiJS ExtractSystem natively accepts a Rectangle frame |

**Key insight:** Both major challenges (smooth tapered strokes and cropped PNG export) have first-class solutions already available in the project's dependencies. All new code should be wiring, not algorithm implementation.

---

## Common Pitfalls

### Pitfall 1: pointermove vs globalpointermove in PixiJS v8

**What goes wrong:** Stroke freezes mid-draw when the pointer briefly leaves the drawing region, producing disconnected segments.

**Why it happens:** In PixiJS v8, `pointermove` only fires on a display object when the pointer is over that specific object. This changed from v7, where canvas-level moves always fired.

**How to avoid:** Listen for `globalpointermove` on `app.stage` (not on the drawing region container) for the move handler. Keep `pointerdown` on the region and `pointerup` / `pointerupoutside` on the stage.

**Warning signs:** Strokes that visibly break or stop updating when the cursor reaches the edge of the drawing card.

### Pitfall 2: Memory Leak from Undestroyed Graphics Objects

**What goes wrong:** After many draw-clear-draw cycles the GPU memory grows steadily.

**Why it happens:** PixiJS Graphics objects allocate GPU buffers. Removing them from the scene graph with `removeChild()` does not free GPU resources — you must call `gfx.destroy()`.

**How to avoid:** In `UndoStack.undo()` and `UndoStack.clear()`, always call `gfx.destroy()` after removing from container.

**Warning signs:** Tab memory climbing in DevTools across multiple clears.

### Pitfall 3: perfect-freehand Polygon Self-Intersection with Earcut

**What goes wrong:** Very tight loops or acute reversals in a stroke produce visual artifacts (missing fill regions, holes).

**Why it happens:** PixiJS uses earcut for polygon triangulation, which does not handle self-intersecting polygons correctly. perfect-freehand outlines can self-intersect during very sharp direction reversals.

**How to avoid:** Keep `streamline` at ≥ 0.4 and `smoothing` at ≥ 0.4 in the stroke options. These reduce sharp reversals. For a sketch tool this is acceptable; the user is unlikely to draw tight enough knots to trigger it consistently.

**Warning signs:** Small holes or missing fill sections appear in strokes that cross themselves.

### Pitfall 4: PNG Export Resolution vs API Cost

**What goes wrong:** High-DPI screens produce enormous PNGs (e.g., 3000×3000 px on a Retina display) sent to Claude Haiku, burning token budget.

**Why it happens:** `renderer.extract.canvas()` defaults to the renderer's device pixel ratio, which can be 2× or 3× on modern screens.

**How to avoid:** Pass an explicit `resolution: 1` option to `extract.canvas()`, or cap the export canvas size after extraction (scale down if either dimension exceeds ~800 px). Resolution 1 at typical drawing region size (600–800 px) gives adequate sketch detail.

**Warning signs:** API payloads > 500 kB for a simple sketch.

### Pitfall 5: Keyboard Shortcut Conflicts with Browser Defaults

**What goes wrong:** `Ctrl+Z` triggers browser undo of the `<input>` or contenteditable elements in the toolbar instead of the drawing undo.

**Why it happens:** Browser default undo fires on the focused element before the canvas.

**How to avoid:** Attach keydown handler to `document` (not `canvas`), call `event.preventDefault()` in the handler, and only trigger drawing undo when no text input is focused.

**Warning signs:** Browser shows its own undo animation or the text inputs lose characters when pressing Ctrl+Z.

---

## Code Examples

### Thickness Preset Map
```typescript
// Claude's discretion: these values balance appearance at screen density
const THICKNESS_PRESETS = {
  thin:   { size: 4,  thinning: 0.6, smoothing: 0.5, streamline: 0.5 },
  medium: { size: 8,  thinning: 0.5, smoothing: 0.5, streamline: 0.4 },
  thick:  { size: 16, thinning: 0.4, smoothing: 0.5, streamline: 0.4 },
} as const;
export type ThicknessPreset = keyof typeof THICKNESS_PRESETS;
```

### Drawing Region Centered on Stage
```typescript
// Source: Pattern from existing main.ts + PixiJS Graphics API
function createDrawingRegion(app: Application): Graphics {
  const W = Math.min(app.screen.width * 0.7, 680);
  const H = Math.min(app.screen.height * 0.75, 560);
  const x = (app.screen.width - W) / 2;
  const y = (app.screen.height - H) / 2 + 28; // offset below toolbar

  const region = new Graphics();
  region.rect(0, 0, W, H).fill(0xffffff);
  region.rect(0, 0, W, H).stroke({ color: 0xd0d0d0, width: 1 });
  region.position.set(x, y);
  region.eventMode = 'static';
  region.cursor = 'crosshair';
  return region;
}
```

### Button State Wiring
```typescript
// Wired from UndoStack events — runs after any push/pop/clear
function syncButtonStates(
  stack: UndoStack,
  submitBtn: HTMLButtonElement,
  clearBtn: HTMLButtonElement,
  undoBtn: HTMLButtonElement,
): void {
  const empty = stack.isEmpty;
  submitBtn.disabled = empty;
  clearBtn.disabled = empty;
  undoBtn.disabled = empty;
}
```

### Keyboard Shortcut Handler
```typescript
document.addEventListener('keydown', (e) => {
  const activeTag = (document.activeElement as HTMLElement)?.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoStack.undo();
    syncButtonStates(undoStack, submitBtn, clearBtn, undoBtn);
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `lineStyle(width, color)` then `moveTo/lineTo` | Build path then call `.stroke({ color, width })` | PixiJS v8 (2024) | Stroke/fill now post-path; must unlearn v7 API |
| `pointermove` on container for drag tracking | `globalpointermove` on stage | PixiJS v8 (2024) | Required change; v7 code will silently break |
| `app.renderer.plugins.extract.image()` | `app.renderer.extract.canvas()` / `.image()` | PixiJS v8 (2024) | Plugins removed; ExtractSystem now built-in |
| `graphics.beginFill()` / `endFill()` | `.poly(points).fill(color)` or `moveTo/lineTo/fill` | PixiJS v8 (2024) | Old API removed or deprecated |

**Deprecated/outdated:**
- `PIXI.Graphics.lineStyle()`: Replaced by `.stroke({ color, width, ... })` post-path in v8.
- `renderer.plugins.extract`: Replaced by `renderer.extract` (built-in system in v8).
- `app.stage.on('pointermove', ...)` for drag: Still works but fires only over interactive objects; use `globalpointermove` for drawing.

---

## Open Questions

1. **Drawing region resize on window resize**
   - What we know: Current PixiJS app uses `resizeTo: window` and the stage scales; the drawing region Graphics object has a fixed position/size computed at init.
   - What's unclear: Whether to reposition the drawing region on resize, or leave it fixed. Resizing mid-stroke would need special handling.
   - Recommendation: For Phase 2, compute region dimensions once at init and do not resize on window resize. This is the simplest correct choice for a PoC.

2. **Touch support depth**
   - What we know: CONTEXT.md says mouse-first, touch is fallback. PixiJS v8 pointer events unify mouse and touch.
   - What's unclear: Whether `simulatePressure: true` in perfect-freehand produces good enough tapers from touch events (which have real pressure on supported devices).
   - Recommendation: Use `simulatePressure: true` (default). Real stylus pressure is a Phase 2+ polish item if needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.0 |
| Config file | `server/vitest.config.ts` (node environment — existing tests cover server) |
| Quick run command | `pnpm run test` (from root, runs all packages) |
| Full suite command | `pnpm run test` |

**Note on client-side testing:** The client has no vitest config or test files. PixiJS drawing logic requires a real WebGL context; unit tests in jsdom for drawing code have low value because canvas is mocked and visual correctness cannot be verified. For Phase 2, drawing validation is **manual** (visual inspection) rather than automated unit tests. The server-side test suite continues to run as the regression gate.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAW-01 | Pointer events start, continue, and end a stroke | manual — PixiJS requires WebGL; jsdom cannot render | — | N/A |
| DRAW-02 | Strokes appear smooth and tapered (not jagged) | manual — visual verification only | — | N/A |
| DRAW-03 | Clear removes all strokes and disables buttons | manual — UI state | — | N/A |
| DRAW-04 | Undo removes last stroke and updates button states | manual — UI state | — | N/A |

### Sampling Rate
- **Per task commit:** `pnpm run test` — existing server tests remain green
- **Per wave merge:** `pnpm run test`
- **Phase gate:** Full server test suite green + manual visual smoke test before `/gsd:verify-work`

### Wave 0 Gaps
- None for test infrastructure — server tests already exist and cover non-drawing logic.
- Client test setup is intentionally deferred: PixiJS WebGL rendering cannot be meaningfully tested in jsdom without a full browser. Add a client vitest config only if logic modules (UndoStack, exportPng bounding box) are separated from PixiJS imports and can run in node/jsdom environments.

*(If pure-logic modules like `UndoStack.ts` are written with zero PixiJS imports, a lightweight vitest unit test could be added. This is at planner's discretion.)*

---

## Sources

### Primary (HIGH confidence)
- PixiJS v8 official docs — Events guide (globalpointermove, eventMode, FederatedPointerEvent): https://pixijs.com/8.x/guides/components/events
- PixiJS v8 ExtractSystem API: https://pixijs.download/dev/docs/rendering.ExtractSystem.html
- PixiJS v8 Graphics API (stroke, moveTo, lineTo, bezierCurveTo, quadraticCurveTo): https://pixijs.download/release/docs/scene.Graphics.html
- perfect-freehand GitHub (getStroke API, options): https://github.com/steveruizok/perfect-freehand

### Secondary (MEDIUM confidence)
- perfect-freehand + PixiJS integration pattern (quadratic curve polygon fill): https://observablehq.com/@ngimbal/pixi-js-x-perfect-freehand
- PixiJS v8 RenderTexture persistent drawing (clear: false pattern): confirmed via https://github.com/pixijs/pixijs/issues/11377
- PixiJS earcut polygon limitation for self-intersecting paths: https://github.com/pixijs/pixijs/issues/11752

### Tertiary (LOW confidence)
- Stroke stabilizer and lazy-brush alternatives — mentioned for completeness, not recommended

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — perfect-freehand is purpose-built and verified against PixiJS integration notebooks; PixiJS v8 is the confirmed project dependency
- Architecture: HIGH — patterns derive directly from official PixiJS v8 docs and verified integration examples
- Pitfalls: HIGH (globalpointermove, destroy()) / MEDIUM (earcut self-intersection) — first two confirmed from official changelogs, third from active GitHub issues

**Research date:** 2026-04-07
**Valid until:** 2026-06-07 (PixiJS v8 stable; perfect-freehand v1.x stable — low churn)
