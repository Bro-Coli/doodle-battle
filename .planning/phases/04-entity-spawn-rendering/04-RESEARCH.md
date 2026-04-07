# Phase 4: Entity Spawn & Rendering - Research

**Researched:** 2026-04-07
**Domain:** PixiJS v8 — texture capture, sprite composition, scene toggling, text labels, filters
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Entity sprite IS the player's drawing — captured as a texture from the drawing canvas
- Transparent background (strokes only, no white rectangle)
- Proportional scaling — roughly 1:5 ratio, preserving relative size differences
- Subtle drop shadow behind entity sprite
- Floating name label centered above entity sprite, always visible
- Behavior profile shown as plain text tooltip on hover (not persistent)
- The Phase 3 recognition card already satisfies RECG-05 — no additional spawn-time UI needed
- Tooltip format: "Wolf — Walking \n Traits: predatory, pack hunter \n Role: Apex predator"
- Entities spawn immediately after recognition card is dismissed
- Random position within game world bounds
- Simple fade-in animation (~0.3 seconds) when entity appears
- Drawing canvas and game world are SEPARATE full-screen views — not the same PixiJS stage
- Manual toggle button to switch between "Draw" mode and "World" mode
- Game world is a separate PixiJS stage/container, same viewport size (no scrolling/camera)
- Plain white/light background for game world — no biome or terrain
- No limit on number of entities
- No entity removal for PoC
- Entities may overlap freely

### Claude's Discretion

- Toggle button placement and styling
- Game world PixiJS setup (separate Application or Container swap)
- Exact fade-in animation implementation
- Drop shadow technique (PixiJS filter or manual)
- Entity tooltip positioning logic
- Exact 1:5 scaling ratio (can adjust for visual quality)
- How entity sprite texture is captured from the drawing strokes

### Deferred Ideas (OUT OF SCOPE)

- Card-based entity system (multiplayer future milestone)
- Timed drawing phases (multiplayer)
- Entity removal / world clearing
- Biome / terrain map
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENTY-01 | Entity spawns as a distinct visual object on the canvas after recognition | Texture capture from stroke container + Sprite creation in world Container |
| ENTY-03 | Multiple entities coexist on the canvas simultaneously | World Container accumulates Sprites; no limit, no removal |
| ENTY-04 | Entity name label floats above its sprite | PixiJS v8 Text object, anchored center, positioned above sprite bounds |
| RECG-05 | Behavior profile displayed to player on spawn (traits, role) | Already satisfied by Phase 3 recognition card; hover tooltip adds richer display |
</phase_requirements>

---

## Summary

Phase 4 introduces a dual-view architecture: the existing drawing canvas and a new persistent "game world" view where recognized entities live. The two views are toggled via a button; only one is visible at a time. The core technical challenge is capturing the player's strokes as a **transparent-background PixiJS texture**, then placing that texture as a Sprite in the world view with a floating Text label and drop shadow.

The existing codebase already provides the critical primitives: `app.renderer.extract.canvas()` is used in `exportPng.ts` to capture a region of the stage — the same system is used here with `clearColor: [0, 0, 0, 0]` to get a transparent texture instead of a white-background PNG. The world view itself is most cleanly implemented as a **second top-level Container on the same PixiJS Application** with `visible` toggled, avoiding the cost and complexity of a second Application instance.

The integration point is the card dismiss callback in `main.ts` (line 102–104). At that moment, the code has both the `EntityProfile` and the `strokeContainerRef`. The entity capture, world spawn, and canvas clear all happen in sequence at dismiss time.

**Primary recommendation:** Use a single PixiJS Application with two root Containers (`drawingRoot` and `worldRoot`). Capture entity sprite with `renderer.generateTexture({ target: strokeContainer, clearColor: [0,0,0,0] })`, scale down ~1:5, add PixiJS v8 Text label centered above, apply `DropShadowFilter` from `pixi-filters` v6, fade in via Ticker, then toggle worldRoot visible.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | ^8.16.0 | Sprite rendering, text labels, Container management, Ticker | Already in project; locked decision |
| pixi-filters | ^6.1.5 | DropShadowFilter for entity sprite | Official PixiJS community filter package, v6 targets PixiJS v8 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | Tooltip uses HTML overlay div (project pattern) | Matches existing RecognitionOverlay pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Container swap (same App) | Second Application instance | Second Application = second WebGL context, higher memory, no shared renderer; overkill for this |
| pixi-filters DropShadowFilter | CSS box-shadow on HTML layer | CSS layer doesn't align with PixiJS coordinate system for moving entities (Phase 5); use PixiJS filter |
| renderer.generateTexture | renderer.extract.canvas → Texture.from | generateTexture is the canonical v8 API; extract is for PNG export. Both work, generateTexture returns RenderTexture directly |
| PixiJS Text label | HTML overlay label | HTML labels require tracking position manually on every frame (Phase 5 problem). In-scene Text moves automatically with parent Container |

**Installation:**
```bash
pnpm --filter @crayon-world/client add pixi-filters
```

---

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── drawing/           # existing — DrawingCanvas, exportPng, StrokeRenderer, UndoStack
├── recognition/       # existing — RecognitionOverlay, recognizeApi
├── world/             # NEW
│   ├── WorldStage.ts      # Manages worldRoot Container, entity list, toggle state
│   ├── EntitySprite.ts    # Builds the Container: sprite + label + shadow + fade
│   └── captureEntityTexture.ts  # Extracts transparent texture from stroke container
└── main.ts            # Wires toggle button + card dismiss → WorldStage.spawnEntity()
```

### Pattern 1: Dual-Container View Toggle

**What:** Two root Containers on `app.stage` — only one visible at a time.

**When to use:** When two full-screen views share the same renderer but never render simultaneously.

```typescript
// Source: PixiJS v8 Container docs — visible property
const drawingRoot = new Container();
const worldRoot = new Container();
app.stage.addChild(drawingRoot);
app.stage.addChild(worldRoot);

worldRoot.visible = false; // start in draw mode

function switchToWorld(): void {
  drawingRoot.visible = false;
  worldRoot.visible = true;
}

function switchToDraw(): void {
  worldRoot.visible = false;
  drawingRoot.visible = true;
}
```

**Key:** The existing `drawingCanvas.region` and `app.stage.addChild(drawingCanvas.region)` in `main.ts` becomes `drawingRoot.addChild(drawingCanvas.region)`.

### Pattern 2: Transparent Texture Capture from Stroke Container

**What:** Capture the stroke container as a RenderTexture with no background, using `renderer.generateTexture`.

**When to use:** To create an entity sprite that is "just the strokes" without a white rectangle.

```typescript
// Source: PixiJS v8 GenerateTextureSystem docs
// clearColor [r, g, b, a] — alpha=0 gives fully transparent background
const texture = app.renderer.generateTexture({
  target: strokeContainer,          // the Container with all committed strokes
  clearColor: [0, 0, 0, 0],         // transparent background — critical for floating look
  resolution: window.devicePixelRatio ?? 1,
  antialias: true,
});
const sprite = new Sprite(texture);
sprite.anchor.set(0.5, 0.5);        // center origin for easy positioning
```

**Pitfall:** `strokeContainer` is a child of `drawingCanvas.region` which is offset in the stage. The coordinates baked into the texture are local to the container — the generated texture dimensions match the container's bounds. Verify with `strokeContainer.getBounds()` before capture.

### Pattern 3: Entity Container with Label

**What:** A PixiJS Container that owns the sprite, the Text label, and the drop shadow filter. This single Container is positioned in the world.

**When to use:** Always — keeps entity data together, simplifies Phase 5 movement (move the container, everything moves).

```typescript
// Source: PixiJS v8 Text migration guide, Sprite docs
import { Container, Sprite, Text, TextStyle } from 'pixi.js';
import { DropShadowFilter } from 'pixi-filters';

function buildEntityContainer(texture: Texture, profile: EntityProfile): Container {
  const entity = new Container();

  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.5);

  // Scale down ~1:5; clamp minimum size for readability
  const scaleFactor = Math.max(0.15, Math.min(0.25, 1 / 5));
  sprite.scale.set(scaleFactor);

  // Drop shadow on the sprite
  sprite.filters = [new DropShadowFilter({ blur: 4, distance: 8, alpha: 0.4 })];

  // Floating name label — above sprite bounds
  const labelStyle = new TextStyle({ fontSize: 12, fill: '#333333', fontWeight: 'bold' });
  const label = new Text({ text: profile.name, style: labelStyle });
  label.anchor.set(0.5, 1);  // bottom-center of text anchored above sprite
  label.y = -(sprite.height * scaleFactor) / 2 - 6;  // 6px gap above sprite top

  entity.addChild(sprite);
  entity.addChild(label);

  return entity;
}
```

### Pattern 4: Fade-in via Ticker

**What:** Gradually increase `entity.alpha` from 0 to 1 over ~0.3 seconds using `app.ticker`.

**When to use:** Every entity spawn.

```typescript
// Source: PixiJS v8 Ticker migration guide — callback receives Ticker instance
entity.alpha = 0;
worldRoot.addChild(entity);

const FADE_DURATION_MS = 300;
let elapsed = 0;
const fadeIn = (ticker: Ticker): void => {
  elapsed += ticker.deltaMS;
  entity.alpha = Math.min(1, elapsed / FADE_DURATION_MS);
  if (entity.alpha >= 1) {
    app.ticker.remove(fadeIn);
  }
};
app.ticker.add(fadeIn);
```

**Note:** In PixiJS v8 the Ticker callback receives a `Ticker` instance (not raw delta). Use `ticker.deltaMS` for milliseconds.

### Pattern 5: HTML Hover Tooltip (project pattern)

**What:** An HTML `div` positioned absolutely over the PixiJS canvas, shown/hidden on `pointerover`/`pointerout` events on the entity Container.

**When to use:** For the behavior profile tooltip. Consistent with project's HTML-overlay pattern (toolbar, RecognitionOverlay).

```typescript
// Source: project pattern (RecognitionOverlay.ts, main.ts toolbar)
entity.eventMode = 'static';
entity.cursor = 'pointer';

entity.on('pointerover', (e) => {
  const canvasBounds = app.canvas.getBoundingClientRect();
  showTooltip(profile, e.global.x + canvasBounds.left, e.global.y + canvasBounds.top);
});
entity.on('pointerout', () => hideTooltip());
```

The tooltip `div` is created on-demand (like RecognitionOverlay) and removed on `pointerout`. Positioned via `style.left` / `style.top` using the global pointer coordinates.

### Anti-Patterns to Avoid

- **White-background entity sprites:** Do not use `clearColor: '#ffffff'` (exportPng pattern) for entity texture capture — it creates visible white rectangles that occlude entities behind them.
- **Two PixiJS Application instances:** Don't create a second `Application` for the world view. Doubles WebGL context usage and breaks Phase 5 (entities in one app can't interact with drawing in the other).
- **HTML elements for name labels:** Name labels must move with the entity in Phase 5. If they're HTML divs, every frame you must recalculate and set `style.left/top`. Use in-scene PixiJS Text instead.
- **Top-level await for entity spawn:** The card dismiss callback in `main.ts` is synchronous — texture capture via `renderer.generateTexture` is synchronous too. No async needed.
- **Capturing the full stage instead of strokeContainer:** `renderer.generateTexture({ target: app.stage })` captures everything including the drawing region border. Capture `strokeContainer` directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drop shadow | Manual second Sprite with blur | `DropShadowFilter` from `pixi-filters` | Handles offset, blur, alpha, rotation; WebGPU compatible via pixi-filters v6 |
| Texture from container | `Canvas2D` drawImage approach | `renderer.generateTexture()` | PixiJS v8 native; respects alpha, transforms, and WebGL/WebGPU renderer |
| Tooltip div management | Custom DOM manager | Extend project's existing overlay pattern | RecognitionOverlay.ts already establishes create-on-show, remove-on-hide |

**Key insight:** The PixiJS renderer already has everything needed. `generateTexture` is the canonical path from "Container with Graphics children" to "Sprite texture" — no canvas manipulation needed.

---

## Common Pitfalls

### Pitfall 1: Texture Not Transparent

**What goes wrong:** Entity sprite has a white background, entities occlude each other.

**Why it happens:** `clearColor` defaults to opaque or is set to `'#ffffff'` (the exportPng pattern).

**How to avoid:** Always pass `clearColor: [0, 0, 0, 0]` to `renderer.generateTexture` for entity sprites.

**Warning signs:** Spawned entities look like white rectangles with strokes on them when overlapping.

### Pitfall 2: Stroke Container Has Wrong Coordinate Origin

**What goes wrong:** Texture is captured at wrong position or has large empty space.

**Why it happens:** `strokeContainer` is a child of `drawingCanvas.region`, which is offset in stage coordinates. `generateTexture` renders the container in its own coordinate space (local). If the strokes have large local coordinate offsets, the captured texture has empty space.

**How to avoid:** Check `strokeContainer.getBounds()` at capture time. If needed, compute a `frame` Rectangle matching the actual stroke bounds (similar to `exportPng.ts` logic). Alternatively, temporarily reparent strokes to a temporary Container at origin — but the simpler approach is using the `frame` option.

**Warning signs:** Entity sprite appears as a tiny image in a huge transparent canvas, scaled down to near-invisible.

### Pitfall 3: Label Position Not Updated When Sprite Scales

**What goes wrong:** Label overlaps the sprite instead of floating above.

**Why it happens:** Label Y offset is computed based on unscaled sprite dimensions, but `sprite.height` after `scale.set(0.2)` is already the scaled height.

**How to avoid:** Compute label Y as `-(sprite.height / 2) - gap` — `sprite.height` after scale assignment already reflects the scaled size in PixiJS v8.

**Warning signs:** Label sits in the middle of or behind the sprite.

### Pitfall 4: Ticker Callback Signature

**What goes wrong:** `dt` (the callback argument) is used as milliseconds but is actually a Ticker object.

**Why it happens:** PixiJS v8 changed Ticker callbacks — the argument is now a `Ticker` instance, not a number.

**How to avoid:** Use `ticker.deltaMS` (milliseconds since last frame), not the argument as a number. See Pattern 4 above.

**Warning signs:** Fade-in completes instantly or takes thousands of frames.

### Pitfall 5: Entity Events Not Working

**What goes wrong:** Hover tooltip never shows on entity Container.

**Why it happens:** Container `eventMode` defaults to `'passive'` — events don't fire unless explicitly set.

**How to avoid:** Set `entity.eventMode = 'static'` on the entity Container (not just the sprite child).

**Warning signs:** `pointerover` listener registered but never called.

### Pitfall 6: worldRoot Not Receiving App Resize

**What goes wrong:** World view has wrong dimensions after window resize.

**Why it happens:** `app.init({ resizeTo: window })` auto-resizes the Application canvas, but Container children do not automatically reposition.

**How to avoid:** For this PoC the world is fixed viewport with no scrolling, so entities just need random placement within `app.screen.width`/`app.screen.height` at spawn time. No resize handler needed.

---

## Code Examples

### Transparent Texture Capture
```typescript
// Source: PixiJS v8 GenerateTextureOptions docs
import { Sprite } from 'pixi.js';

export function captureEntityTexture(
  app: Application,
  strokeContainer: Container,
): Sprite {
  const bounds = strokeContainer.getBounds();

  const texture = app.renderer.generateTexture({
    target: strokeContainer,
    frame: new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height),
    clearColor: [0, 0, 0, 0],  // fully transparent background
    resolution: 1,              // resolution 1 to keep size manageable
    antialias: true,
  });

  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  return sprite;
}
```

### DropShadowFilter Application
```typescript
// Source: pixi-filters v6 docs — import from 'pixi-filters'
import { DropShadowFilter } from 'pixi-filters';

sprite.filters = [
  new DropShadowFilter({
    blur: 3,
    distance: 6,
    rotation: 45,
    alpha: 0.35,
    shadowOnly: false,
  })
];
```

### View Toggle Button
```typescript
// Source: project pattern — HTML overlay buttons (main.ts toolbar)
const toggleBtn = document.createElement('button');
toggleBtn.id = 'view-toggle';
toggleBtn.textContent = 'World';  // shows what you'll switch TO
toggleBtn.addEventListener('click', () => {
  const inWorld = !worldRoot.visible;
  worldRoot.visible = inWorld;
  drawingRoot.visible = !inWorld;
  toggleBtn.textContent = inWorld ? 'Draw' : 'World';
});
document.body.appendChild(toggleBtn);
```

### Integration with Card Dismiss Callback (main.ts)
```typescript
// Source: existing main.ts pattern — card dismiss callback
overlay.showCard(profile, () => {
  // 1. Capture texture BEFORE clearing
  const entity = worldStage.spawnEntity(
    app,
    drawingCanvas.strokeContainerRef,
    profile,
  );
  // 2. Clear drawing canvas
  drawingCanvas.clear();
  enableAllToolbar();
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cacheAsBitmap = true` | `container.cacheAsTexture()` | PixiJS v8 | Same concept, new API name |
| Ticker callback `(dt: number)` | Ticker callback `(ticker: Ticker)` | PixiJS v8 | Use `ticker.deltaMS`, not raw arg |
| `new Text('hello', style)` | `new Text({ text: 'hello', style })` | PixiJS v8 | Object params, not positional |
| `new BitmapText('hello', style)` | `new BitmapText({ text: 'hello', style })` | PixiJS v8 | Same pattern |
| Sprites can have children | Only Containers can have children | PixiJS v8 | Entity "container" must be a Container, not a Sprite |

**Deprecated/outdated:**
- `PIXI.Sprite.from('url')` still works but prefer `new Sprite(texture)` with pre-loaded texture
- `@pixi/filter-drop-shadow` (individual package): merged into `pixi-filters` v6 bundle — use `pixi-filters` package

---

## Open Questions

1. **Exact frame computation for generateTexture**
   - What we know: `strokeContainer` bounds may have large offsets if drawing region is offset
   - What's unclear: Whether `generateTexture` with `frame` uses stage coordinates or local container coordinates
   - Recommendation: Test in Wave 1 with a debug entity. If empty space appears, add `strokeContainer.getBounds()` frame clamping (same approach as `exportPng.ts`).

2. **pixi-filters v6 and PixiJS v8.16 compatibility**
   - What we know: pixi-filters v6.1.5 (Nov 2024) targets PixiJS v8 per release notes
   - What's unclear: Whether v8.16.0 (latest) exposes any breaking changes since v6.1.5 was released
   - Recommendation: Install and verify `DropShadowFilter` renders correctly in Wave 1 before committing to it. If broken, fall back to a manual second Graphics with `BlurFilter` (built-in).

3. **Drawing root Container ownership of drawingCanvas.region**
   - What we know: `main.ts` currently does `app.stage.addChild(drawingCanvas.region)`
   - What's unclear: Whether reparenting to `drawingRoot` breaks any internal DrawingCanvas coordinate assumptions (pointer events use `e.getLocalPosition(this._region)`)
   - Recommendation: DrawingCanvas uses local position relative to `_region`, not stage. Reparenting to `drawingRoot` should be transparent. Verify pointer events work in Wave 1.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (server package only — no client test runner configured) |
| Config file | `server/vitest.config.ts` |
| Quick run command | `pnpm run test` |
| Full suite command | `pnpm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENTY-01 | Entity spawns as visual object after recognition | manual-only | — | N/A |
| ENTY-03 | Multiple entities coexist without replacing each other | manual-only | — | N/A |
| ENTY-04 | Entity name label floats above sprite | manual-only | — | N/A |
| RECG-05 | Behavior profile displayed at spawn time | manual-only | — | N/A (satisfied by Phase 3 card) |

**Manual-only justification:** All phase 4 requirements are visual/rendering behaviors that depend on a live WebGL context and DOM. Vitest runs in Node environment — PixiJS v8 requires a real or mocked WebGL context unavailable in the server test environment. The client has no test runner configured. Visual correctness is verified by running `pnpm run dev:client` and inspecting the result.

**Existing tests to keep green:**
```bash
pnpm run test  # server tests — must remain green after main.ts refactor
```

The card dismiss callback changes in `main.ts` are client-only. Server tests are unaffected.

### Sampling Rate
- **Per task commit:** `pnpm run test` (server suite — verifies nothing broken)
- **Per wave merge:** `pnpm run test` + manual browser smoke test
- **Phase gate:** All server tests green + manual visual verification before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No new test files needed for this phase — visual rendering cannot be unit tested in current stack
- [ ] If client test infrastructure is desired in future: add `vitest` + `@vitest/browser` or `jsdom` with `pixi.js` mock to `client/package.json`

---

## Sources

### Primary (HIGH confidence)
- [PixiJS v8 Migration Guide](https://pixijs.com/8.x/guides/migrations/v8) — Ticker callback changes, Text constructor changes, Sprite-cannot-have-children
- [PixiJS v8 GenerateTextureSystem docs](https://pixijs.download/v8.16.0/docs/rendering.GenerateTextureSystem.html) — generateTexture signature, GenerateTextureOptions
- [PixiJS v8 Filters guide](https://pixijs.com/8.x/guides/components/filters) — Filter application pattern, built-in filters
- [PixiJS v8 Cache As Texture guide](https://pixijs.com/8.x/guides/components/scene-objects/container/cache-as-texture) — renderer.generateTexture recommended pattern
- Existing `client/src/drawing/exportPng.ts` — `app.renderer.extract.canvas` with `clearColor` option confirmed in production code

### Secondary (MEDIUM confidence)
- [pixi-filters GitHub releases](https://github.com/pixijs/filters/releases) — v6.1.5 targets PixiJS v8 (Jan 2024 notes reference v8)
- [pixi-filters npm](https://www.npmjs.com/package/pixi-filters) — package name and version confirmed
- [PixiJS filters docs](https://pixijs.io/filters/docs/) — DropShadowFilter import and constructor options

### Tertiary (LOW confidence)
- WebSearch results on generateTexture transparent background — `clearColor: [0,0,0,0]` inferred from array format documentation; needs empirical validation in Wave 1

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pixi.js already in project, pixi-filters v6 confirmed for v8
- Architecture (Container swap vs dual App): HIGH — PixiJS docs confirm visibility toggling; two-App approach confirmed as anti-pattern
- Texture capture API: MEDIUM — generateTexture signature confirmed, transparent clearColor value inferred
- Drop shadow filter: MEDIUM — import path confirmed, options confirmed; v8.16 compatibility not 100% verified
- Pitfalls: HIGH — based on existing project code analysis and PixiJS v8 migration guide

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable library, 30-day horizon)
