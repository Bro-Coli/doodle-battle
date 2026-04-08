---
phase: 09-round-ui-end-to-end-integration
plan: "01"
subsystem: ui
tags: [pixi, round-lifecycle, overlay, html-overlay]

# Dependency graph
requires:
  - phase: 07-round-state-machine-entity-removal
    provides: RoundPhase state machine, _endRound(), onRoundPhaseChange callback
  - phase: 08-interaction-behaviors
    provides: Entity simulation behaviors wired into round simulation
provides:
  - Round outcome card (centered overlay) showing round number, survivors, and eliminated entities
  - showOutcome(data, onDismiss) / hideOutcome() methods on RoundOverlay
  - _roundNumber, _namesAtRoundStart, _lastOutcome tracking in WorldStage
  - showRoundOutcome(onDismiss) public method on WorldStage
  - Deferred draw-mode switch — toolbar stays locked until outcome card is dismissed
affects: [future-round-phases, scoring, persistence]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Create-on-show / remove-on-dismiss HTML overlay pattern (same as RecognitionOverlay)"
    - "Dismissed boolean + dismiss() closure for idempotency on click events"
    - "Snapshot-diff pattern: capture entity names at round start, diff against names at round end"

key-files:
  created: []
  modified:
    - client/src/world/RoundOverlay.ts
    - client/src/world/WorldStage.ts
    - client/src/main.ts
    - client/src/style.css

key-decisions:
  - "Outcome card uses no auto-dismiss timer — player reads at their own pace"
  - "WorldStage.showRoundOutcome() encapsulates overlay access — main.ts never holds a RoundOverlay reference"
  - "Round number incremented at startRound() entry (before async work) to avoid off-by-one across retries"
  - "All toolbar re-enable logic deferred into the dismiss callback — toolbar stays locked during card display"
  - "z-index 50 for outcome card: above spinner (40) and toolbar (10), below countdown (100) which is already gone"

patterns-established:
  - "Snapshot-diff for outcome data: _namesAtRoundStart captured in startRound(), diffed in _endRound() before phase callback fires"
  - "Dismissed boolean closure guards against double-dismiss on rapid clicks"

requirements-completed: [ROUND-04]

# Metrics
duration: ~25min (including human verification)
completed: 2026-04-08
---

# Phase 9 Plan 01: Round UI End-to-End Integration Summary

**Outcome card showing round number, survivors, and eliminated entities closes the full draw-start-analyze-simulate-outcome-draw loop with toolbar gating throughout.**

## Performance

- **Duration:** ~25 min (including human verification checkpoint)
- **Started:** 2026-04-08T17:13:32+09:00
- **Completed:** 2026-04-08T17:13:57+09:00 (tasks 1-2); human verification approved
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 4

## Accomplishments

- Added `RoundOutcome` interface and `showOutcome(data, onDismiss)` / `hideOutcome()` to `RoundOverlay` using the same create-on-show / remove-on-dismiss pattern as `RecognitionOverlay`
- Added round number tracking, entity name snapshot at round start, and survivor/eliminated diff in `WorldStage._endRound()` — populates `lastOutcome` before the phase callback fires
- Wired outcome card into `main.ts` `onRoundPhaseChange('idle')` handler: toolbar and view-toggle remain disabled until the player dismisses the card, then draw mode and toolbar are restored
- Human verified full loop: draw -> start round -> analyzing spinner -> 30s countdown -> outcome card (Round 1) -> dismiss -> draw -> second round shows Round 2

## Task Commits

1. **Task 1: Add outcome card to RoundOverlay, outcome data to WorldStage, CSS** - `c7f5bf0` (feat)
2. **Task 2: Wire outcome card into main.ts round lifecycle** - `c2990da` (feat)
3. **Task 3: Verify complete round lifecycle E2E** - human-verify (approved by user)

## Files Created/Modified

- `client/src/world/RoundOverlay.ts` - Added `RoundOutcome` interface, `showOutcome()`, `hideOutcome()`, `_outcomeEl` field
- `client/src/world/WorldStage.ts` - Added `_roundNumber`, `_namesAtRoundStart`, `_lastOutcome` fields; `lastOutcome` getter; `showRoundOutcome()` method; snapshot + diff in `startRound()`/`_endRound()`
- `client/src/main.ts` - Replaced immediate draw-mode switch in `onRoundPhaseChange('idle')` with deferred callback inside `showRoundOutcome()`
- `client/src/style.css` - Added `#round-outcome`, `.round-outcome__heading`, `.round-outcome__section`, `.round-outcome__hint` styles

## Decisions Made

- No auto-dismiss timer: player reads outcome at their own pace (locked decision from prior research).
- `WorldStage.showRoundOutcome()` encapsulates the overlay — keeps `RoundOverlay` internal to `WorldStage`, no second reference in `main.ts`.
- Round number incremented at `startRound()` entry before any async work to prevent off-by-one if future retry logic is added.
- All re-enable logic (toolbar, view toggle, syncStartRoundBtn) lives inside the dismiss callback, so the toolbar is naturally locked for the full card display duration without extra gating state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ROUND-04 is fully satisfied: all four round phases have clear UI indicators (idle=draw mode, analyzing=spinner, simulating=countdown, done=outcome card).
- The complete draw-to-draw loop is playable and repeatable with correct round numbering.
- Ready for any future phases that build on round outcomes (scoring, leaderboard, persistence).

---
*Phase: 09-round-ui-end-to-end-integration*
*Completed: 2026-04-08*
