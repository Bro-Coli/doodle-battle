---
phase: 12-server-authoritative-simulation
plan: 01
subsystem: simulation
tags: [colyseus, schema, game-loop, entity-simulation, tdd]

# Dependency graph
requires:
  - phase: 11-lobby-players
    provides: GameRoom base class with PlayerSchema and lobby message handlers
  - phase: 10-networking-infrastructure
    provides: Colyseus server integration with Express, setSimulationInterval, Schema decorators
provides:
  - EntitySchema with render-critical fields (entityId, x, y, hp, name, archetype, teamId, vx, vy) in GameState.entities MapSchema
  - GameRoom._tick running dispatchBehavior at 20Hz via setSimulationInterval
  - Fight resolution removing defeated entities from Schema (propagates to clients)
  - spawn_entity and interaction_matrix room message handlers
  - WORLD_BOUNDS canonical constant in shared/src/simulation/EntitySimulation.ts
affects:
  - 12-02 (client rendering from Schema patches — consumes EntitySchema and WORLD_BOUNDS)
  - 13-game-phase-lifecycle (round lifecycle will use spawn_entity and interaction_matrix messages)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server-side EntityState Map (velocities, timers) separate from Schema (render fields only)
    - toRemove array pattern — collect removals during tick iteration, delete after loop
    - _handleFightContact marks dyingEntities, tick cleans up after iteration
    - TDD red-green: test file committed first, implementation second

key-files:
  created:
    - server/tests/gameRoom.simulation.test.ts
  modified:
    - server/src/rooms/GameRoom.ts
    - shared/src/simulation/EntitySimulation.ts

key-decisions:
  - "EntitySchema contains only render-critical fields — full EntityState (velocities, timers) stays in server-side Map"
  - "vx/vy added to EntitySchema so clients can infer sprite orientation without position-delta inference"
  - "WORLD_BOUNDS defined in shared/src/simulation/EntitySimulation.ts as canonical constant (1280x720)"
  - "_handleFightContact takes toRemove array parameter to avoid mutation during tick iteration"

patterns-established:
  - "toRemove pattern: collect entity IDs during tick loop, delete from all maps after loop completes"
  - "Private simulation state (_entityStates, _entityProfiles, etc.) as plain Map/Set — not Schema fields"
  - "Message handlers prefixed _handle* and extractable for unit testing without Colyseus server"

requirements-completed: [SSIM-01, SSIM-03]

# Metrics
duration: 3min
completed: 2026-04-09
---

# Phase 12 Plan 01: Server-Authoritative Simulation Summary

**EntitySchema syncing x/y/hp/vx/vy to Colyseus clients at 20Hz via GameRoom._tick, with fight resolution removing entities server-side using the toRemove-after-iteration pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-09T05:34:14Z
- **Completed:** 2026-04-09T05:37:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `WORLD_BOUNDS = { width: 1280, height: 720 }` as canonical constant in shared simulation module
- Added `EntitySchema` with 9 decorated fields and `entities MapSchema<EntitySchema>` to `GameState`
- Implemented `GameRoom._tick` at 20Hz: calls `dispatchBehavior`, resolves interactions, bounces borders, handles spreading pendingSpawn, syncs Schema
- Implemented fight resolution: `_handleFightContact` decrements HP, marks dying entities, toRemove pattern prevents mid-iteration mutation
- Implemented `spawn_entity` and `interaction_matrix` message handlers with field validation
- 15 new unit tests all pass; all 106 pre-existing tests continue to pass

## Task Commits

1. **Task 1: Add WORLD_BOUNDS constant** - `89099f0` (feat)
2. **Task 2 RED: Add failing simulation tests** - `86505e6` (test)
3. **Task 2 GREEN: Implement EntitySchema, tick, handlers** - `8d8325b` (feat)

## Files Created/Modified
- `shared/src/simulation/EntitySimulation.ts` - Added `WORLD_BOUNDS` export
- `server/src/rooms/GameRoom.ts` - Added EntitySchema, _tick loop, message handlers, fight resolution
- `server/tests/gameRoom.simulation.test.ts` - 15 unit tests for simulation behavior

## Decisions Made
- `vx` and `vy` added to EntitySchema (two floats per entity per patch) so clients can orient sprites without inferring direction from position deltas between patches — simpler client code at negligible bandwidth cost
- `_handleFightContact` accepts `toRemove` array parameter rather than pushing to an instance-level array, making test setup simpler and keeping the function pure with respect to iteration state
- Spreading entity copy spawn happens inside `_tick` by detecting `pendingSpawn === true` on `SpreadingState`, creating a new UUID entity immediately — cleaner than the old client-side `_spawnCopy()` approach

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- One pre-existing test failure in `gameRoom.test.ts` (`start_game handler > broadcasts game_starting and locks room when valid`) was already failing before this plan. Not introduced by this work, not fixed (out of scope per deviation scope boundary rules).

## Next Phase Readiness
- Server tick runs at 20Hz writing entity positions to Schema; clients receive patches automatically via Colyseus state sync
- Plan 02 can wire `room.onStateChange` on client to apply Schema positions to PixiJS containers
- `spawn_entity` message handler ready to receive entity spawns from client game logic
- `interaction_matrix` handler ready to receive AI-generated matrices from client

---
*Phase: 12-server-authoritative-simulation*
*Completed: 2026-04-09*
