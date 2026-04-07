---
phase: 05-entity-simulation
plan: 03
subsystem: simulation
tags: [pixi.js, game-loop, entity-simulation, ticker, spreading-copies]

# Dependency graph
requires:
  - phase: 05-01
    provides: speed field on EntityProfile (integer 1-10)
  - phase: 05-02
    provides: EntitySimulation engine with initEntityState and dispatchBehavior
  - phase: 04-02
    provides: WorldStage with spawnEntity and worldRoot container
provides:
  - Game loop ticker in WorldStage driving all 6 archetype behaviors
  - Spreading copy spawn logic (copies capped at one generation depth via isACopy)
  - Walking and flying entity rotation to face movement direction
  - Entity position update each frame from delta-time simulation
affects: [future multiplayer sync, Colyseus state serialization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single shared _gameTick (not per-entity) registered on app.ticker
    - Entity state stored in Map<Container, EntityState> — not on Container object
    - deltaMS / 1000 for seconds-based delta time
    - isACopy flag prevents chain-spreading beyond one generation
    - _entityTextures and _entityProfiles maps enable copy spawning without re-recognizing

key-files:
  created: []
  modified:
    - client/src/world/WorldStage.ts

key-decisions:
  - "Single shared game tick iterates all entity state entries — one ticker registration per WorldStage, not per entity"
  - "Spreading copies inherit parent texture and profile for visual consistency, initialized with isACopy=true to prevent chain reactions"
  - "Walking and flying rotation uses Math.atan2(vy, vx) guarded by velocity threshold (>0.01) to avoid jitter during pauses"

patterns-established:
  - "Game loop pattern: single ticker, Map-based state, pure dispatchBehavior, write position back to container"
  - "Copy spawn pattern: parent holds texture+profile maps, copy gets isACopy=true on init"

requirements-completed: [ENTY-02]

# Metrics
duration: 5min
completed: 2026-04-07
---

# Phase 5 Plan 3: Entity Simulation — Game Loop Integration Summary

**Single shared PixiJS ticker drives all 6 archetype behaviors simultaneously with spreading copy spawn logic and directional rotation for walking/flying entities**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-07T08:00:00Z
- **Completed:** 2026-04-07T08:05:00Z
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 1

## Accomplishments
- WorldStage now registers a single `_gameTick` on `app.ticker` that iterates all entity containers and updates positions from `dispatchBehavior` output
- Spreading entities spawn one generation of copies near the parent; copies are initialized with `isACopy=true` so they never chain-react
- Walking and flying entities rotate to face their movement direction each frame using `Math.atan2(vy, vx)`
- All 6 archetypes visually verified in browser: walking wanders with pauses, flying arcs smoothly, rooted sways without drifting, spreading spawns local copies, drifting bobs horizontally, stationary holds still

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire game loop and spreading copy spawns into WorldStage** - `d02a1a6` (feat)
2. **Task 2: Visual verification of all 6 archetype movement patterns** - human-verify (approved by user, no code commit)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `client/src/world/WorldStage.ts` — Added `_entityStates`, `_entityTextures`, `_entityProfiles` maps; `_gameTick` ticker; `_spawnCopy` method; updated `spawnEntity` to initialize simulation state

## Decisions Made
- Single shared `_gameTick` — not per-entity — prevents ticker proliferation as entities are added
- `isACopy` flag set at init time on spread copies so the copy suppression is handled inside the existing `initEntityState` return value path without special casing in `dispatchBehavior`
- Rotation guarded by `Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01` to freeze rotation during walking pauses (matches plan spec)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All 6 archetype behaviors are live in the game world and visually verified
- Phase 5 is complete — entity simulation engine is fully wired end-to-end
- Ready for polish, multiplayer prep (Colyseus), or hackathon submission

---
*Phase: 05-entity-simulation*
*Completed: 2026-04-07*
