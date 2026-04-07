---
phase: 03-recognition-pipeline
plan: "02"
subsystem: ui
tags: [pixi, vite, fetch, typescript, html-overlay]

# Dependency graph
requires:
  - phase: 03-recognition-pipeline/03-01
    provides: POST /api/recognize returning EntityProfile, GET /api/recognize/status returning mockMode flag
  - phase: 02-drawing-canvas
    provides: exportPng(), DrawingCanvas with clear/isEmpty/strokeContainerRef/region, toolbar buttons
provides:
  - Player-facing recognition flow: spinner overlay, entity result card, error toast, mock badge
  - recognizeDrawing() fetch wrapper with one silent retry on failure
  - RecognitionOverlay class managing all transient HTML overlay elements
  - Rewired async submit handler with toolbar disable/enable lifecycle
affects: [04-entity-spawn-rendering, 05-entity-simulation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HTML overlay elements created and removed on demand — no persistent DOM"
    - "Toolbar disable/enable lifecycle: disableAllToolbar() → showSpinner → recognition → showCard/showError → enableAllToolbar()"
    - "Canvas clear deferred to card dismiss callback — drawing stays visible during spinner and card"
    - "submitRecognition() extracted as named function to allow retry path to re-invoke full flow"

key-files:
  created:
    - client/src/recognition/recognizeApi.ts
    - client/src/recognition/RecognitionOverlay.ts
  modified:
    - client/src/main.ts
    - client/src/style.css
    - server/src/routes/recognize.ts

key-decisions:
  - "Canvas clears only on card dismiss, not on submit — drawing stays visible during spinner and card reveal"
  - "One silent retry in recognizeApi before surfacing error toast — matches locked plan decision"
  - "submitRecognition() extracted from click handler so retry button can re-invoke the full submit flow"
  - "RecognitionOverlay creates elements on showX() and removes on dismiss — no persistent DOM nodes"
  - "Mock badge fetched via GET /api/recognize/status at init — non-critical, errors swallowed silently"

patterns-established:
  - "Overlay pattern: create element → append to body → remove on dismiss (no hidden/show toggling)"
  - "onDismiss guard: boolean flag prevents double-fire from simultaneous auto-timer and click events"
  - "Toolbar lifecycle: disable all → recognition in flight → re-enable via callback (card dismiss or error dismiss)"

requirements-completed: [RECG-01, RECG-03, RECG-04]

# Metrics
duration: ~45min
completed: 2026-04-07
---

# Phase 03 Plan 02: Recognition UI Summary

**Player-facing recognition flow — spinner overlay, entity reveal card with auto-dismiss, error toast with retry, and mock mode badge wired to async submit handler**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-07T06:01:05Z
- **Completed:** 2026-04-07
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 5

## Accomplishments

- `recognizeApi.ts` posts canvas PNG to `/api/recognize` with one silent retry on failure before surfacing an error
- `RecognitionOverlay` manages all transient UI states: spinner (with 10-second soft timeout message), entity reveal card (5-second auto-dismiss or click-to-dismiss), error toast with retry button, and mock mode badge
- Submit handler is fully async — disables all toolbar buttons on submit, clears canvas only when card dismisses, re-enables toolbar on card or error dismiss
- Retry button in error toast correctly re-invokes the full `submitRecognition()` flow (deviation fixed post-task)

## Task Commits

Each task was committed atomically:

1. **Task 1: Recognition API client, overlay components, CSS, and rewired submit handler** - `5722c1f` (feat)
2. **Task 1 deviation fix: Retry button re-submits recognition** - `95a4444` (fix)
3. **Task 2: Human-verify checkpoint — approved by user** (no code changes)

**Plan metadata:** _(docs commit created after state updates)_

## Files Created/Modified

- `client/src/recognition/recognizeApi.ts` — `recognizeDrawing(dataUrl)` with one silent retry, 30-second AbortController timeout, throws on second failure
- `client/src/recognition/RecognitionOverlay.ts` — class with `showSpinner()`, `hideSpinner()`, `showCard()`, `showError()`, `showMockBadge()` — all elements created/removed on demand
- `client/src/main.ts` — async submit handler, `disableAllToolbar()`, `enableAllToolbar()`, mock badge init fetch, `submitRecognition()` extracted for retry reuse
- `client/src/style.css` — `.spinner-overlay`, `.spinner`, `.spinner-timeout-msg`, `.result-card`, `.error-toast`, `.mock-badge` CSS classes added
- `server/src/routes/recognize.ts` — `GET /status` endpoint appended, returns `{ mockMode: boolean }`

## Decisions Made

- Canvas clears only on card dismiss callback, not at submit time — drawing must remain visible during spinner and card reveal (locked plan decision honored)
- `submitRecognition()` extracted as a named function so the retry button path can re-invoke it, rather than wiring a raw re-submit inside `showError()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Retry button dismissed toast without re-submitting recognition**
- **Found during:** Post-Task 1 verification (browser test of error path)
- **Issue:** `showError()` took only a `message` and `onDismiss` callback. The Retry button called `onDismiss` (re-enabling toolbar) but did not re-invoke recognition. User clicking Retry saw the toolbar re-enable with no new spinner — functionally a dismiss, not a retry.
- **Fix:** Extracted the full submit flow into `submitRecognition(dataUrl)` in `main.ts`. `showError()` now accepts an `onRetry` callback (separate from `onDismiss`). Retry button calls `onRetry`; X button calls `onDismiss`. Both paths remove the toast.
- **Files modified:** `client/src/recognition/RecognitionOverlay.ts`, `client/src/main.ts`
- **Verification:** Browser error path confirmed: Retry re-shows spinner and re-runs recognition; X re-enables toolbar without re-submitting.
- **Committed in:** `95a4444` (fix(03-02): retry button now re-submits recognition instead of just dismissing)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Essential UX correctness fix. No scope creep.

## Issues Encountered

None beyond the retry button bug documented above.

## User Setup Required

None — no external service configuration required. MOCK_AI=true covers local dev. Real Anthropic API key already documented in `.env.example`.

## Next Phase Readiness

- Full recognition pipeline is end-to-end: draw → submit → spinner → entity card → dismiss → canvas clear → repeat
- `EntityProfile` (name, archetype, traits, role) arrives in the browser and is displayed to the player
- Phase 04 (Entity Spawn & Rendering) can consume the `EntityProfile` from the card dismiss callback — `main.ts` currently calls `drawingCanvas.clear()` there; Phase 04 will replace or augment that with `spawnEntity(profile)`
- No blockers for Phase 04

---
*Phase: 03-recognition-pipeline*
*Completed: 2026-04-07*
