---
phase: 04-entity-spawn-rendering
plan: 01
subsystem: ui
tags: [pixi.js, pixi-filters, typescript, canvas, entity-rendering, drop-shadow]

# Dependency graph
requires:
  - phase: 03-recognition-pipeline
    provides: EntityProfile from recognizeDrawing, strokeContainerRef getter on DrawingCanvas
  - phase: 02-drawing-canvas
    provides: DrawingCanvas with strokeContainerRef and region getters

provides:
  - captureEntityTexture: transparent RenderTexture from stroke container bounds
  - buildEntityContainer: entity Container with sprite, drop shadow, floating label, fade-in
  - WorldStage: dual-container draw/world architecture with toggle() and spawnEntity()
  - View toggle button in toolbar switching between draw mode and world mode

affects:
  - 04-02-entity-simulation (entity containers are the spawn points for behavior)

# Tech tracking
tech-stack:
  added: [pixi-filters@6.1.5]
  patterns:
    - "Dual-container stage: drawingRoot/worldRoot toggled via .visible for draw vs world modes"
    - "generateTexture with clearColor [0,0,0,0] for transparent entity sprites"
    - "Ticker-based fade-in: closure captures elapsed, removes itself when complete"
    - "Entity spawn before canvas clear: texture captured while strokes still present"

key-files:
  created:
    - client/src/world/captureEntityTexture.ts
    - client/src/world/EntitySprite.ts
    - client/src/world/WorldStage.ts
  modified:
    - client/src/main.ts
    - client/src/style.css
    - client/package.json

key-decisions:
  - "pixi-filters v6 uses offset: PointData instead of distance scalar for DropShadowFilter — plan had wrong API"
  - "Entity spawned before canvas clear in card dismiss callback so texture captures live strokes"
  - "drawingCanvas.region reparented into worldStage.drawingRoot (not app.stage directly) to support view toggling"

patterns-established:
  - "WorldStage is the single point of view management — main.ts delegates all toggle/spawn to it"
  - "captureEntityTexture bounds-crops to stroke content — no empty whitespace in entity sprites"

requirements-completed: [ENTY-01, ENTY-04]

# Metrics
duration: 18min
completed: 2026-04-07
---

# Phase 4 Plan 01: Entity Spawn & Rendering Summary

**Drawing-to-entity pipeline: transparent sprite capture from canvas strokes, DropShadow + label assembly, and dual-container draw/world view architecture with animated fade-in**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-07T15:50:00Z
- **Completed:** 2026-04-07T15:58:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `captureEntityTexture` uses `generateTexture` with `clearColor: [0,0,0,0]` — entity sprites have no white rectangle background
- `buildEntityContainer` assembles sprite + DropShadowFilter + floating name label + 300ms ticker-based fade-in into a single Container
- `WorldStage` manages dual-container architecture — one toggle call flips draw mode to world mode and back
- `main.ts` refactored: `drawingCanvas.region` reparented into `worldStage.drawingRoot`, card dismiss now captures texture and spawns entity before clearing canvas
- View toggle button added to toolbar, always enabled, styled distinctly as a dark mode-switch control

## Task Commits

Each task was committed atomically:

1. **Task 1: Install pixi-filters and create entity rendering modules** - `deec72e` (feat)
2. **Task 2: Create WorldStage module and refactor main.ts for dual-container architecture** - `349aef7` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `client/src/world/captureEntityTexture.ts` - Captures transparent texture from stroke container using `generateTexture`
- `client/src/world/EntitySprite.ts` - Builds entity Container: scaled sprite, DropShadowFilter, floating label, fade-in
- `client/src/world/WorldStage.ts` - Dual-container root; toggle(), spawnEntity() methods
- `client/src/main.ts` - Refactored to use WorldStage; card dismiss spawns entity; view-toggle button added
- `client/src/style.css` - `#view-toggle` button styles added
- `client/package.json` - pixi-filters dependency added

## Decisions Made

- **pixi-filters v6 DropShadowFilter uses `offset: PointData`, not `distance`** — the plan specified `{ blur: 3, distance: 6, alpha: 0.35 }` but the actual v6 API takes `offset: { x, y }`. Fixed to `{ blur: 3, offset: { x: 4, y: 6 }, alpha: 0.35 }`.
- **Entity spawned before canvas clear** — texture capture must happen while strokes are still in `strokeContainer`, confirmed as locked decision from plan.
- **drawingCanvas.region reparented into drawingRoot** — direct `app.stage.addChild` replaced with `worldStage.drawingRoot.addChild` for view-toggle to work correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DropShadowFilter v6 API: `distance` does not exist**
- **Found during:** Task 1 (captureEntityTexture and EntitySprite creation)
- **Issue:** Plan specified `{ blur: 3, distance: 6, alpha: 0.35 }` but pixi-filters v6 `DropShadowFilterOptions` has no `distance` property — uses `offset: PointData` instead. TypeScript compilation failed with TS2353.
- **Fix:** Changed to `{ blur: 3, offset: { x: 4, y: 6 }, alpha: 0.35 }` matching the actual interface
- **Files modified:** `client/src/world/EntitySprite.ts`
- **Verification:** `pnpm exec tsc --noEmit -p tsconfig.json` exits clean
- **Committed in:** `deec72e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in plan's API usage)
**Impact on plan:** Necessary fix; plan referenced v5 API, v6 ships a different interface. No scope creep.

## Issues Encountered

None beyond the DropShadowFilter API mismatch documented above.

## Next Phase Readiness

- Entity spawn pipeline complete: draw → recognize → dismiss card → entity appears in world view
- WorldStage and entity Container types are ready for behavior attachment in Phase 4 Plan 02 (simulation)
- Entity containers have `eventMode = 'static'` and `cursor = 'pointer'` pre-set for hover/click interactions

---
*Phase: 04-entity-spawn-rendering*
*Completed: 2026-04-07*
