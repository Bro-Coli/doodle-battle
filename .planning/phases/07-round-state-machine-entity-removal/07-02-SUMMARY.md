---
phase: 07-round-state-machine-entity-removal
plan: "02"
subsystem: ui
tags: [round-lifecycle, toolbar, button-state, view-switching, dom]
dependency_graph:
  requires:
    - phase: 07-round-state-machine-entity-removal/07-01
      provides: [RoundPhase, startRound, entityCount, roundPhase, onRoundPhaseChange]
  provides: [startRoundBtn, round-phase-ui-gating, auto-view-switching]
  affects: [client/src/main.ts, client/src/style.css]
tech_stack:
  added: []
  patterns: [syncStartRoundBtn helper for conditional enable/disable, phase-change callback for UI gating]
key_files:
  created: []
  modified:
    - client/src/main.ts
    - client/src/style.css
key_decisions:
  - "viewToggleBtn.disabled = true during analyzing phase only — player can peek at draw mode during simulation"
  - "syncStartRoundBtn() called both in enableAllToolbar() and in card dismiss callback — covers both post-round and post-spawn paths"
  - "disableAllToolbar() includes startRoundBtn — round cannot be started while another is active"
  - "Auto-switch to world on Start Round click, auto-switch to draw on round end (idle phase)"
patterns_established:
  - "syncStartRoundBtn: conditional enable helper pattern alongside existing syncButtonState"
  - "onRoundPhaseChange callback wires WorldStage internal state machine to DOM UI"
requirements-completed: [ROUND-01, ROUND-02, ROUND-03]
duration: 5min
completed: "2026-04-07"
---

# Phase 7 Plan 02: Start Round UI Wiring Summary

**Start Round button wired into toolbar with green styling, toolbar gating through all round phases, auto-view-switching on round start/end, and viewToggle locked during analyzing spinner.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-07
- **Completed:** 2026-04-07
- **Tasks:** 1 of 2 (Task 2 is human verification checkpoint)
- **Files modified:** 2

## Accomplishments
- `startRoundBtn` created with `#start-round` id, appended to toolbar after viewToggleBtn
- `syncStartRoundBtn()` helper gates button on `entityCount > 0 && roundPhase === 'idle'`
- `disableAllToolbar()` now includes `startRoundBtn` — prevents triggering a round mid-round
- `enableAllToolbar()` calls `syncStartRoundBtn()` to restore correct state after round ends
- `onRoundPhaseChange` callback auto-switches view, gates viewToggle during analyzing, re-enables toolbar on idle
- CSS: green `#start-round` button with disabled grey state and `#round-countdown` badge styles

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Start Round button and wire round phase callbacks in main.ts** - `d863925` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `client/src/main.ts` - Added startRoundBtn, syncStartRoundBtn, disableAllToolbar update, enableAllToolbar update, click handler, onRoundPhaseChange callback, toolbar appendChild
- `client/src/style.css` - Added #start-round button styles (green/disabled), #round-countdown badge styles

## Decisions Made
- `viewToggleBtn` is locked (`disabled = true`) only during `analyzing` phase — the spinner must stay visible. During `simulating`, the player can freely peek at draw mode.
- `syncStartRoundBtn()` is called in both `enableAllToolbar()` (post-round restore) and directly in the card dismiss callback (post-spawn first enable). This double-call is intentional — covers all paths.
- `disableAllToolbar()` disables `startRoundBtn` to prevent a second round being triggered if the user is somehow in a weird state. The click handler has its own guard too (defense in depth).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Task 2 (human-verify checkpoint) pending — user must run the dev servers and verify the complete round lifecycle end-to-end
- After approval, Phase 7 Plan 02 is fully complete
- Phase 8 (interaction behavior integration) can proceed once round UI is confirmed working

## Self-Check: PASSED

### Files Exist
- client/src/main.ts: FOUND
- client/src/style.css: FOUND
- .planning/phases/07-round-state-machine-entity-removal/07-02-SUMMARY.md: FOUND

### Commits Exist
- d863925: feat(07-02): wire Start Round button and round phase callbacks in main.ts

---
*Phase: 07-round-state-machine-entity-removal*
*Completed: 2026-04-07*
