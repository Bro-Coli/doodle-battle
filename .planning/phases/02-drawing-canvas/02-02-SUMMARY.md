---
phase: 02-drawing-canvas
plan: "02"
subsystem: ui
tags: [pixi.js, canvas, drawing, png-export, submit]

# Dependency graph
requires:
  - phase: 02-drawing-canvas/02-01
    provides: DrawingCanvas with strokeContainer and region getters, UndoStack with onChange callback, wired toolbar buttons
provides:
  - exportPng module: cropped bounding-box PNG data URL from PixiJS renderer
  - Submit button wired: export, log data URL, auto-clear canvas
  - Complete drawing workflow: draw -> submit -> export -> auto-clear -> draw again
affects: [03-recognition-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PixiJS renderer.extract.canvas with Rectangle frame for cropped PNG export
    - Resolution capped at 1 to limit file size (Phase 3 sends to API)
    - Submit auto-clears canvas after export via drawingCanvas.clear()
    - PixiJS native stroke with round caps/joins replaces perfect-freehand polygon fill

key-files:
  created:
    - client/src/drawing/exportPng.ts
  modified:
    - client/src/main.ts
    - client/src/drawing/StrokeRenderer.ts

key-decisions:
  - "PixiJS native stroke (round caps/joins) + neighbor-averaging smoothing replaces perfect-freehand polygon fill — eliminates flickering on tight spirals"
  - "Export frame clamped to drawing region bounds to prevent capturing outside the white card"
  - "Resolution fixed at 1 in extract call to control PNG file size before sending to Claude API"

patterns-established:
  - "exportPng is a pure function — takes app, strokeContainer, region; returns data URL string or null"
  - "Submit handler: export -> log -> clear. Phase 3 replaces the log line with a POST to /api/recognize"

requirements-completed: [DRAW-01, DRAW-03]

# Metrics
duration: ~20min
completed: 2026-04-07
---

# Phase 2 Plan 02: Drawing Canvas Summary

**PNG export via PixiJS renderer.extract with cropped bounding box, submit button auto-clears canvas, and stroke rendering refactored to PixiJS native stroke eliminating polygon fill flicker**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-07T04:23:00Z
- **Completed:** 2026-04-07T04:32:56Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 updated)

## Accomplishments
- exportPng module crops PNG to stroke bounding box with padding, clamped to drawing region, resolution 1
- Submit button exports PNG data URL to console, then auto-clears canvas for next drawing
- Stroke rendering replaced: PixiJS native stroked lines with round caps/joins and 0.1-strength neighbor-averaging smoothing — no more polygon fill flicker on tight spirals
- Complete drawing workflow verified by user: draw, undo, thickness presets, clear, submit, auto-clear, repeat

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PNG export module and wire submit button** - `c6f64b9` (feat)
2. **Task 2 (deviation): Replace polygon fill with stroked lines and light smoothing** - `6793b57` (fix)

**Plan metadata:** (forthcoming)

## Files Created/Modified
- `client/src/drawing/exportPng.ts` - Cropped bounding-box PNG export using PixiJS renderer.extract; returns data URL string or null when canvas empty
- `client/src/main.ts` - Submit button handler: calls exportPng, logs data URL, calls drawingCanvas.clear()
- `client/src/drawing/StrokeRenderer.ts` - Replaced getStroke polygon fill with PixiJS native stroke (round caps/joins) + neighbor-averaging smoothing

## Decisions Made
- Export frame clamped to region bounds to never capture content outside the white drawing card
- Resolution fixed at 1 in renderer.extract to keep PNG file size reasonable for Claude API calls in Phase 3
- PixiJS native stroke chosen over perfect-freehand polygon fill — eliminates visible flicker and unwanted fill artifacts on tight curves

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced perfect-freehand polygon fill with PixiJS native stroke**
- **Found during:** Task 2 (human-verify checkpoint — visual review)
- **Issue:** perfect-freehand outline+fill approach caused flickering and unwanted interior fills on tight spirals and sharp curves, degrading the drawing experience
- **Fix:** Replaced polygon fill in StrokeRenderer.ts with PixiJS native stroke using round caps/joins and simple neighbor-averaging smoothing (strength 0.1). perfect-freehand is still installed as a dependency but no longer called in StrokeRenderer.
- **Files modified:** client/src/drawing/StrokeRenderer.ts
- **Verification:** User visually confirmed strokes render smoothly without flicker; TypeScript compiled clean
- **Committed in:** 6793b57 (separate fix commit after task 1)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was necessary for correct rendering behavior. No scope creep — StrokeRenderer is the sole file affected.

## Issues Encountered
None beyond the stroke rendering deviation documented above. TypeScript compiled clean on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PNG export is ready for Phase 3: replace the `console.log` in the submit handler with a POST to `/api/recognize`
- Data URL format is `data:image/png;base64,...` — standard for sending to Claude vision API
- Server tests still passing, no regressions
- perfect-freehand package remains in client/package.json but is unused; can be removed before Phase 3 if desired

---
*Phase: 02-drawing-canvas*
*Completed: 2026-04-07*
