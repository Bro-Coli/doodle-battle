---
phase: 07-round-state-machine-entity-removal
plan: "01"
subsystem: world-stage
tags: [round-lifecycle, state-machine, entity-removal, pixi-ticker, dom-overlay]
dependency_graph:
  requires: []
  provides: [RoundPhase, startRound, removeEntity, fetchInteractions, RoundOverlay]
  affects: [client/src/world/WorldStage.ts]
tech_stack:
  added: []
  patterns: [create-on-show/remove-on-dismiss DOM, setInterval for wall-clock countdown, ticker-based fade animation, idempotent guard pattern]
key_files:
  created:
    - client/src/world/fetchInteractions.ts
    - client/src/world/RoundOverlay.ts
  modified:
    - client/src/world/WorldStage.ts
decisions:
  - "RoundPhase has no 'done' state — _endRound() transitions simulating directly to idle (done was unobservable)"
  - "Entities freeze between rounds via _gameTick early return on non-simulating phase"
  - "removeEntity() deletes from all 5 maps before calling destroy() to prevent leaked GPU texture references"
  - "fetchInteractions failure produces empty-entries fallback (all-ignore) rather than blocking the round"
  - "Countdown uses setInterval not PixiJS ticker — wall-clock accuracy for display counter"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 7 Plan 01: Round State Machine and Entity Removal Summary

**One-liner:** Round lifecycle state machine (idle/analyzing/simulating) with 30s auto-end timer, fade-out entity removal cleaning all 5 maps and GPU resources, fetchInteractions client helper, and RoundOverlay DOM overlay with spinner and countdown.

## What Was Built

### fetchInteractions.ts (new)
Client-side fetch helper that POSTs entity profiles to `/api/interactions` and returns an `InteractionMatrix`. Throws a descriptive `Error` on non-ok HTTP responses. Import path from WorldStage: `./fetchInteractions`.

### RoundOverlay.ts (new)
DOM overlay class with two distinct UI elements:
- **Analyzing spinner**: Full-screen semi-transparent backdrop with CSS spinner ring (reuses `.spinner` class from style.css) and "Analyzing..." label. Created on `showAnalyzingSpinner()`, removed on `hideAnalyzingSpinner()`.
- **Countdown badge**: Fixed top-right badge showing remaining seconds. Uses `setInterval` (wall-clock) not PixiJS ticker. Created on `startCountdown(30)`, removed on `stopCountdown()`.

### WorldStage.ts (modified)
Added to the existing class:

**Type exported:** `RoundPhase = 'idle' | 'analyzing' | 'simulating'`

**New private fields:**
- `_roundPhase: RoundPhase` (starts idle)
- `_dyingEntities: Set<Container>` (excluded from behavior dispatch)
- `_interactionMatrix: InteractionMatrix | null`
- `_roundTimer: number | null` (setTimeout ID for 30s auto-end)
- `_roundOverlay: RoundOverlay` (instantiated in constructor)
- `_onRoundPhaseChange: callback | null`

**Public API added:**
- `get entityCount(): number`
- `get roundPhase(): RoundPhase`
- `get interactionMatrix(): InteractionMatrix | null`
- `set onRoundPhaseChange(cb)`
- `async startRound(): Promise<void>` — idle guard, entity count guard, phase transitions, API call with fallback, 30s timer
- `removeEntity(container): void` — idempotent, 0.5s fade-out, cleans all 5 maps then destroys GPU resources

**_gameTick modifications:**
1. Early return when `_roundPhase !== 'simulating'` (entities frozen outside simulation)
2. `continue` for containers in `_dyingEntities` (dying entities excluded from behavior dispatch)

## Decisions Made

1. **No 'done' RoundPhase state** — The original design included idle→analyzing→simulating→done→idle but 'done' was immediately overwritten to 'idle' synchronously, making it unobservable. Direct simulating→idle transition is cleaner.

2. **Delete-before-destroy in removeEntity()** — Maps are cleared before `container.destroy({ children: true })` to prevent any ticker callbacks that fire between map deletion and destroy from accessing stale texture references.

3. **fetchInteractions failure uses empty-entries fallback** — Consistent with server behavior; empty entries means all-ignore, so the round proceeds without interactions rather than blocking.

4. **setInterval for countdown** — Using `setInterval` rather than the PixiJS ticker ensures the countdown reflects real wall time regardless of frame rate.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- client/src/world/fetchInteractions.ts: FOUND
- client/src/world/RoundOverlay.ts: FOUND
- client/src/world/WorldStage.ts: FOUND (modified)

### Commits Exist
- 2e45f82: feat(07-01): add fetchInteractions helper and RoundOverlay DOM overlay
- b65edff: feat(07-01): add RoundPhase state machine and entity removal to WorldStage

## Self-Check: PASSED
