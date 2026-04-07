---
phase: 05-entity-simulation
plan: 02
subsystem: simulation
tags: [pixi, entity, behavior, simulation, pure-functions, tdd, dt-based]

# Dependency graph
requires:
  - phase: 04-entity-spawn-rendering
    provides: EntitySprite, WorldStage, entity spawn pipeline on canvas dismiss
provides:
  - EntityState discriminated union type for all 6 archetypes
  - initEntityState factory for spawning from EntityProfile
  - dispatchBehavior dispatcher keyed by archetype
  - wrapPosition torus-topology utility
  - mapSpeed profile-to-pixels mapper
  - 6 pure behavior functions (walking, flying, rooted, spreading, drifting, stationary)
  - Unit tests for all behavior logic
affects: [05-entity-simulation plan 03 — EntitySprite tick loop integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure behavior functions with (state, dt, world) -> state contract, TDD red-green cycle for simulation logic]

key-files:
  created:
    - client/src/world/EntitySimulation.ts
    - client/src/world/behaviors/walkingBehavior.ts
    - client/src/world/behaviors/flyingBehavior.ts
    - client/src/world/behaviors/rootedBehavior.ts
    - client/src/world/behaviors/spreadingBehavior.ts
    - client/src/world/behaviors/driftingBehavior.ts
    - client/src/world/behaviors/stationaryBehavior.ts
    - server/tests/behaviors.test.ts
  modified: []

key-decisions:
  - "Behavior functions use (state, dt, world) => state contract — pure, no PixiJS, Colyseus-compatible"
  - "flyingBehavior tracks bobOriginY as the real Y base; final y = bobOriginY + sin(bobPhase)*8 prevents vertical drift"
  - "walkingBehavior encodes pause/walk state machine in pauseTimer/walkTimer fields — no enum needed"
  - "spreadingBehavior returns state unchanged for isACopy entities — no chain spawning"
  - "EntitySimulation imports @crayon-world/shared/src/types (not relative path) — consistent with client convention and avoids rootDir tsc error"

patterns-established:
  - "Pure behavior pattern: each function takes (state: XState, dt: number, world: WorldBounds) and returns XState — no mutation, no side effects"
  - "State transition on timer expiry: timer <= 0 -> transition immediately and set new timer in same frame"

requirements-completed: [ENTY-02]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 5 Plan 02: Entity Simulation Behaviors Summary

**6 pure archetype behavior functions with delta-time simulation, torus wrap-around, and full unit test coverage — no PixiJS dependencies**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-07T07:47:29Z
- **Completed:** 2026-04-07T07:50:01Z
- **Tasks:** 3 (Task 0 TDD RED, Task 1 EntitySimulation module, Task 2 behavior implementations GREEN)
- **Files modified:** 8

## Accomplishments

- EntitySimulation.ts with EntityState union type, dispatchBehavior, initEntityState, wrapPosition, mapSpeed, WorldBounds
- 6 pure behavior functions each producing visually distinct motion patterns
- 12 behavior unit tests covering wrapPosition edges, no-drift checks, copy suppression, stationary identity, walking state machine
- All 47 tests in the suite pass

## Task Commits

Each task was committed atomically:

1. **Task 0: Behavior test scaffold (RED)** - `57627ac` (test)
2. **Task 1 + 2: EntitySimulation module and 6 behavior functions (GREEN)** - `06188c7` (feat)

## Files Created/Modified

- `client/src/world/EntitySimulation.ts` - EntityState union, WorldBounds, initEntityState, dispatchBehavior, wrapPosition, mapSpeed
- `client/src/world/behaviors/walkingBehavior.ts` - Patrol wander: walk -> pause -> new direction state machine
- `client/src/world/behaviors/flyingBehavior.ts` - Smooth arcs with angularVelocity, sine bob via separate bobOriginY tracking
- `client/src/world/behaviors/rootedBehavior.ts` - 3px sway around fixed originX via swayPhase
- `client/src/world/behaviors/spreadingBehavior.ts` - pendingSpawn timer with isACopy suppression
- `client/src/world/behaviors/driftingBehavior.ts` - Horizontal drift with sine bob from fixed bobOriginY
- `client/src/world/behaviors/stationaryBehavior.ts` - Identity return (no-op)
- `server/tests/behaviors.test.ts` - 12 unit tests for all behavior functions and utilities

## Decisions Made

- flyingBehavior tracks `bobOriginY` as the base Y and computes `y = bobOriginY + sin(bobPhase) * 8` — this prevents the bob from drifting the entity vertically over time. The wrap is applied to `bobOriginY`, not the bobbed `y`.
- walkingBehavior encodes the full pause/walk state machine in two numeric timers (`pauseTimer` and `walkTimer`) — no enum or string state needed. The zero-timer case is handled identically to expiry.
- EntitySimulation.ts imports `Archetype` from `@crayon-world/shared/src/types` (package alias) instead of a relative path — consistent with existing client convention and avoids the `rootDir` TypeScript error.
- spreadingBehavior returns the state object unchanged for `isACopy` entities — short-circuits the function entirely before any timer mutation.

## Deviations from Plan

None — plan executed exactly as written. The one minor fix was using the workspace alias `@crayon-world/shared/src/types` instead of a relative path for the Archetype import (pre-existing convention, not a deviation).

## Issues Encountered

None — TypeScript compiled cleanly on first attempt after switching to the workspace import alias. All tests passed GREEN after implementing the behavior functions.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- dispatchBehavior, initEntityState, and EntityState are ready to be wired into EntitySprite's ticker loop (Plan 03)
- SpreadingState.pendingSpawn signal is ready for Plan 03's EntityManager to consume and spawn copies
- All behavior functions are PixiJS-free and can be run server-side for future Colyseus compatibility

---
*Phase: 05-entity-simulation*
*Completed: 2026-04-07*
