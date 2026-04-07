---
phase: 04-entity-spawn-rendering
plan: "02"
subsystem: ui
tags: [pixijs, canvas, entity, tooltip, hover, sprite, texture]

# Dependency graph
requires:
  - phase: 04-entity-spawn-rendering-01
    provides: WorldStage, EntitySprite, captureEntityTexture — entity spawn pipeline with dual-container architecture
  - phase: 03-recognition-pipeline
    provides: EntityProfile type, recognition card overlay (RECG-05 satisfied)
provides:
  - EntityTooltip module — create-on-show HTML tooltip showing name, archetype, traits, role
  - Hover events on all entity containers wired to tooltip show/hide/move
  - Multi-entity coexistence verified (3+ entities simultaneously in world view)
  - Complete draw-to-entity pipeline visually verified end-to-end
affects:
  - 05-entity-simulation (entities interactive, hover confirmed working, tooltip anchors available)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Create-on-show tooltip pattern: DOM element created in showTooltip(), removed in hideTooltip() — no persistent nodes (same as RecognitionOverlay)"
    - "pointermove on entity container updates tooltip position as cursor moves within bounds"
    - "getLocalBounds() for PixiJS generateTexture — global getBounds() captures empty area when container has no parent offset"
    - "Text resolution set to window.devicePixelRatio for sharp labels on high-DPI screens"

key-files:
  created:
    - client/src/world/EntityTooltip.ts
  modified:
    - client/src/world/EntitySprite.ts
    - client/src/world/captureEntityTexture.ts
    - client/src/style.css

key-decisions:
  - "Entity tooltip uses create-on-show DOM pattern (same as RecognitionOverlay) — no persistent DOM nodes"
  - "Tooltip positioned with position:fixed and pointer-events:none — follows cursor without intercepting mouse events"
  - "captureEntityTexture uses getLocalBounds() not getBounds() — PixiJS generateTexture operates in local space"
  - "Name label Text resolution set to window.devicePixelRatio for crisp rendering on retina displays"

patterns-established:
  - "Create-on-show overlay: create element in show(), remove in hide(), module-level ref tracks active element"
  - "Entity hover tooltip: pointerover/pointermove/pointerout wired on Container, tooltip follows global pointer coords offset by canvas getBoundingClientRect()"

requirements-completed: [ENTY-03, RECG-05]

# Metrics
duration: 15min
completed: 2026-04-07
---

# Phase 04 Plan 02: Entity Tooltip and Multi-Entity Coexistence Summary

**HTML hover tooltip showing entity behavior profile (name, archetype, traits, role) wired to PixiJS pointer events, with full draw-to-entity pipeline visually verified across 3+ coexisting entities**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-07T15:59:15Z
- **Completed:** 2026-04-07T16:06:33Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments

- EntityTooltip module with `showTooltip` / `hideTooltip` following the create-on-show pattern established by RecognitionOverlay
- All entity containers wired with `pointerover`, `pointermove`, and `pointerout` events — tooltip follows cursor within entity bounds
- Two post-implementation bugs found and fixed: invisible sprite (wrong bounds method) and blurry label (low text resolution on retina)
- Human visual verification confirmed: entity sprites render the actual drawing, labels float above, tooltips show correct profile data per entity, 3+ entities coexist without replacing each other

## Task Commits

1. **Task 1: Create EntityTooltip and wire hover events** - `35073fa` (feat)
2. **Task 1 (deviation fixes): Fix invisible sprite and blurry label** - `aa38640` (fix)
3. **Task 2: Visual verification checkpoint** - approved by human (no code changes)

## Files Created/Modified

- `client/src/world/EntityTooltip.ts` — New module; exports `showTooltip(profile, x, y)` and `hideTooltip()`; creates single `.entity-tooltip` div on show, removes on hide
- `client/src/world/EntitySprite.ts` — Added `pointerover`, `pointermove`, `pointerout` event handlers wired to EntityTooltip; bumped Text resolution to `window.devicePixelRatio` and font size to 14px
- `client/src/world/captureEntityTexture.ts` — Changed `getBounds()` to `getLocalBounds()` for correct texture capture region
- `client/src/style.css` — Added `.entity-tooltip` (fixed position, white bg, shadow, pointer-events none) and `.entity-tooltip__header` (bold first line) styles

## Decisions Made

- Tooltip uses `position: fixed` so it works correctly regardless of scroll position or canvas offset
- `pointer-events: none` on tooltip prevents it from triggering `pointerout` on the entity when cursor reaches tooltip edge
- Module-level `activeTooltip` variable in EntityTooltip allows `showTooltip` to update content/position of an existing tooltip rather than creating duplicate nodes
- Tooltip offset: +12px right, +12px down from cursor to prevent flickering at element boundary

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invisible entity sprite after spawn**
- **Found during:** Task 2 (visual verification checkpoint)
- **Issue:** `captureEntityTexture.ts` called `container.getBounds()` (global coordinates relative to the stage) to compute the render region for `generateTexture`. At spawn time the container had not yet been added to the stage, so `getBounds()` returned a zero-area or offset rectangle — resulting in a blank/invisible texture.
- **Fix:** Replaced `getBounds()` with `getLocalBounds()` which returns bounds in the container's own local coordinate space, matching what `generateTexture` expects.
- **Files modified:** `client/src/world/captureEntityTexture.ts`
- **Verification:** Entity sprite renders the player's drawing correctly after spawn
- **Committed in:** `aa38640`

**2. [Rule 1 - Bug] Fixed blurry name label on retina displays**
- **Found during:** Task 2 (visual verification checkpoint)
- **Issue:** `Text` object for the entity name label was created with default resolution (1), causing blurriness on high-DPI screens where `window.devicePixelRatio` is 2.
- **Fix:** Set `resolution: window.devicePixelRatio` on the Text style; also bumped font size from 12px to 14px for improved readability.
- **Files modified:** `client/src/world/EntitySprite.ts`
- **Verification:** Name label is sharp and legible on retina display
- **Committed in:** `aa38640`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correct visual rendering. No scope creep — core tooltip and hover wiring matched plan exactly.

## Issues Encountered

Both bugs were discovered during visual verification (Task 2 checkpoint). They were fixed and re-verified before the checkpoint was approved. No blockers — fixes were straightforward once the root cause was identified.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 4 complete: full draw-to-entity pipeline working (draw → recognize → spawn → hover tooltip → multi-entity coexistence)
- Phase 5 (Entity Simulation) can start immediately: entities are positioned in `worldRoot`, each has an `EntityProfile`, and the `WorldStage` architecture supports per-tick update loops
- Concern carried forward: spreading and drifting archetype behavior functions are underspecified — worth design time before coding Phase 5

---
*Phase: 04-entity-spawn-rendering*
*Completed: 2026-04-07*
