---
phase: 12-server-authoritative-simulation
plan: 02
subsystem: simulation
tags: [colyseus, schema, pixijs, entity-rendering, multiplayer]

# Dependency graph
requires:
  - phase: 12-server-authoritative-simulation/12-01
    provides: EntitySchema with x/y/hp/vx/vy fields in GameState.entities MapSchema, spawn_entity and interaction_matrix handlers
  - phase: 10-networking-infrastructure
    provides: ColyseusClient with getActiveRoom() and room.onStateChange
provides:
  - WorldStage.spawnFromSchema(entityId, profile, x, y) — Schema-driven entity container creation
  - WorldStage.applyPositions(entities) — server position patch application with orientation
  - WorldStage.removeEntityById(entityId) — Schema-driven entity removal with fade-out
  - WorldStage.multiplayerMode setter — gates _gameTick (no-op when server drives simulation)
  - MultiplayerWorldBridge — single integration point between Colyseus room and WorldStage
affects:
  - 13-game-phase-lifecycle (round lifecycle will use sendSpawnEntity and sendInteractionMatrix via bridge)
  - 14-win-condition (entity removal propagation already working via removeEntityById)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - UUID-keyed container maps parallel to existing Container-keyed maps for multiplayer lookup
    - Reverse map _entityIdByContainer for O(1) UUID cleanup on fade-out completion
    - Duck-typed EntitySchemaLike avoids importing server Schema class (decorator-only) on client
    - multiplayerMode flag gates simulation tick — single boolean switches client between solo and MP

key-files:
  created:
    - client/src/features/world/MultiplayerWorldBridge.ts
  modified:
    - client/src/features/world/WorldStage.ts

key-decisions:
  - "UUID-keyed container maps added parallel to existing Container-keyed maps — spawnFromSchema stores in both, removeEntity cleans both"
  - "Reverse map _entityIdByContainer (Container -> string) enables O(1) UUID cleanup during fade-out without iterating the forward map"
  - "EntitySchemaLike interface duck-types Schema fields on client side — avoids importing server-only Schema classes with decorators"
  - "multiplayerMode setter makes _gameTick a no-op — single-player path completely unchanged, multiplayer flips flag via bridge.connect()"
  - "Colyseus 0.17 onStateChange does not support removing individual callbacks — disconnect() nulls _room to prevent further state application"

patterns-established:
  - "Parallel keyed maps pattern: UUID string maps for network identity, Container maps for PixiJS operations — both maintained in sync"
  - "MultiplayerWorldBridge has zero PixiJS imports and zero Colyseus Schema imports — pure integration glue via public APIs"

requirements-completed: [SSIM-02, SSIM-01, SSIM-03]

# Metrics
duration: 8min
completed: 2026-04-09
---

# Phase 12 Plan 02: Client Render-from-Schema Summary

**WorldStage refactored to render-only mode with UUID-keyed maps; MultiplayerWorldBridge wires Colyseus room.onStateChange to spawn/position/remove PixiJS entity containers from Schema patches**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-09T05:38:00Z
- **Completed:** 2026-04-09T05:46:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added three new public methods to WorldStage: `spawnFromSchema`, `applyPositions`, `removeEntityById` — each driving a distinct Schema lifecycle event
- Added UUID-keyed container maps with reverse lookup for O(1) map cleanup on entity fade-out
- Added `multiplayerMode` flag gating `_gameTick` so server-driven simulation and client-side simulation cannot run simultaneously
- Created `MultiplayerWorldBridge` with zero PixiJS and zero Schema class dependencies — pure integration between Colyseus room state and WorldStage public API
- Single-player code path completely unchanged; all pre-existing functionality still works

## Task Commits

1. **Task 1: Refactor WorldStage to render-only mode with UUID-keyed containers** - `597e530` (feat)
2. **Task 2: Create MultiplayerWorldBridge — wire Colyseus room state to WorldStage** - `355b924` (feat)

## Files Created/Modified
- `client/src/features/world/WorldStage.ts` - Added spawnFromSchema, applyPositions, removeEntityById, multiplayerMode setter, UUID-keyed maps, reverse map, _gameTick multiplayer guard
- `client/src/features/world/MultiplayerWorldBridge.ts` - New module: connects room.onStateChange to WorldStage, diffs entity sets, sends spawn_entity and interaction_matrix messages

## Decisions Made
- UUID-keyed parallel maps: Adding `_entityContainersById` and `_entityIdByContainer` reverse maps alongside existing Container-keyed maps avoids refactoring existing single-player infrastructure while enabling UUID-based multiplayer lookup
- `EntitySchemaLike` interface: Duck-typing Schema fields on the client avoids importing server-only decorated classes (which cannot be used in browser context without special bundler config)
- `multiplayerMode` boolean flag: Simplest possible switch between single-player (_gameTick runs simulation) and multiplayer (server owns simulation, _gameTick returns early) — no conditional logic scattered throughout the class
- Colyseus 0.17 `disconnect()`: Setting `_room = null` rather than trying to remove the specific `onStateChange` listener, since Colyseus 0.17's `onStateChange` doesn't expose a targeted removal API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `shared/src/simulation/EntitySimulation.ts` and `interactionBehaviors.ts` (Cannot find module '@crayon-world/shared/src/types', implicit any, missing return) were present before this plan and are out of scope per deviation boundary rules. Not introduced by this work, not fixed. Client builds successfully with Vite despite these tsc warnings.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WorldStage can now render entities driven entirely by server Schema patches
- MultiplayerWorldBridge.connect(room) is ready to be called after a player joins a Colyseus room
- sendSpawnEntity and sendInteractionMatrix are wired and ready for game phase lifecycle (Plan 13)
- Entity removal propagation works: server removes entity from Schema → onStateChange fires → removeEntityById triggers fade-out on all clients

---
*Phase: 12-server-authoritative-simulation*
*Completed: 2026-04-09*
