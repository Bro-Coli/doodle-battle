---
phase: 10-networking-infrastructure
plan: "01"
subsystem: networking
tags: [colyseus, shared, simulation, websocket, express]
dependency_graph:
  requires: []
  provides: [shared-simulation-module, colyseus-server]
  affects: [client-world-stage, server-tests, server-routes]
tech_stack:
  added: [colyseus@0.17.8, "@colyseus/core@0.17.40", "@colyseus/schema@4.0.19", "@colyseus/ws-transport@0.17.11", "@colyseus/sdk@0.17"]
  patterns: [shared-behavior-functions, http-server-multiplexing, colyseus-room]
key_files:
  created:
    - shared/src/simulation/EntitySimulation.ts
    - shared/src/simulation/interactionBehaviors.ts
    - shared/src/simulation/behaviors/walkingBehavior.ts
    - shared/src/simulation/behaviors/flyingBehavior.ts
    - shared/src/simulation/behaviors/rootedBehavior.ts
    - shared/src/simulation/behaviors/spreadingBehavior.ts
    - shared/src/simulation/behaviors/driftingBehavior.ts
    - shared/src/simulation/behaviors/stationaryBehavior.ts
    - server/src/rooms/GameRoom.ts
  modified:
    - client/src/world/WorldStage.ts
    - server/tests/behaviors.test.ts
    - server/tests/interactionBehaviors.test.ts
    - server/src/index.ts
    - server/tsconfig.json
    - server/package.json
    - client/package.json
  deleted:
    - client/src/world/EntitySimulation.ts
    - client/src/world/interactionBehaviors.ts
    - client/src/world/behaviors/ (entire directory, 6 files)
decisions:
  - "Used Server class from @colyseus/core (not defineServer) — both work in 0.17 but class constructor is more explicit"
  - "experimentalDecorators and useDefineForClassFields added to server/tsconfig.json only, not tsconfig.base.json (preserves PixiJS v8 compatibility)"
  - "GameRoom.ts imports from @colyseus/core directly, not from the colyseus bundle (avoids pulling in redis/playground deps)"
metrics:
  duration_seconds: 175
  tasks_completed: 3
  tasks_total: 3
  files_created: 9
  files_modified: 7
  files_deleted: 9
  completed_date: "2026-04-08"
---

# Phase 10 Plan 01: Shared Simulation Module and Colyseus Server Summary

**One-liner:** Moved pure behavior functions to `shared/src/simulation/` importable by both server and client, then integrated Colyseus 0.17 alongside Express on port 3001 using a shared `http.Server`.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Move behavior files to shared/src/simulation/ | 4ae9cac | shared/src/simulation/ (8 files created) |
| 2 | Update all import paths and delete old files | 7ce9c50 | WorldStage.ts, behaviors.test.ts, interactionBehaviors.test.ts |
| 3 | Install Colyseus and rewire server | 02c17a2 | server/src/index.ts, server/src/rooms/GameRoom.ts, server/tsconfig.json |

## Verification Results

- `pnpm test` — 88 tests pass across 6 test files
- `pnpm --filter @crayon-world/client exec vite build` — builds cleanly (895 modules)
- `ls shared/src/simulation/behaviors/` — 6 behavior files present
- `ls client/src/world/behaviors/` — directory no longer exists
- Server tests confirm Express routes (`/api/recognize`, `/api/interactions`) respond correctly

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note:** The plan mentioned trying `defineServer` first from `@colyseus/core`. Inspection of the package showed both `Server` class and `defineServer` function are exported. Chose `new Server()` directly as it's the more common pattern in 0.17 examples and avoids the extra abstraction layer. `GameRoom.ts` imports from `@colyseus/core` directly rather than the `colyseus` bundle to avoid pulling in optional heavy dependencies (redis, playground, auth).

## Self-Check: PASSED

- shared/src/simulation/EntitySimulation.ts — FOUND
- shared/src/simulation/interactionBehaviors.ts — FOUND
- server/src/rooms/GameRoom.ts — FOUND
- server/src/index.ts — FOUND
- Commit 4ae9cac — FOUND
- Commit 7ce9c50 — FOUND
- Commit 02c17a2 — FOUND
