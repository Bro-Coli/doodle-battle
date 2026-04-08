---
phase: 10-networking-infrastructure
plan: 02
subsystem: networking
tags: [colyseus, websocket, schema, binary-patch, vite, cors]

# Dependency graph
requires:
  - phase: 10-01
    provides: Colyseus server with GameRoom and PingState Schema running on port 3001
provides:
  - Client Colyseus connection module (ColyseusClient.ts) with connectToRoom and verifySync
  - Human-verified binary patch sync: server Schema mutations arrive as patches on browser client
  - CORS configured for cross-origin WebSocket connections in dev
affects:
  - 11-lobby-players
  - 12-server-authoritative-simulation
  - 13-game-phase-lifecycle

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Colyseus client uses http:// URL (not ws://) — SDK handles protocol upgrade internally"
    - "onStateChange used instead of state.listen for @colyseus/sdk 0.17 compatibility"
    - "Manual /matchmake/ route with matchMaker API instead of defineServer (avoids tsx class name conflict)"

key-files:
  created:
    - client/src/network/ColyseusClient.ts
  modified:
    - server/src/index.ts
    - client/src/main.tsx

key-decisions:
  - "Used onStateChange (room-level) instead of state.listen (field-level) for 0.17 SDK compatibility"
  - "Server index.ts uses manual matchMaker.defineRoomType + /matchmake/ route instead of Server.defineServer (tsx class name conflict bug)"
  - "CORS updated to regex localhost pattern with credentials: true to allow cross-origin WebSocket handshake in dev"
  - "verifySync exposed on window.__verifyColyseusSync for browser console testing without UI wiring"

patterns-established:
  - "Colyseus SDK 0.17: connect via http URL, use onStateChange for state updates, not state.listen"
  - "Manual matchmake route pattern for tsx compatibility: matchMaker.defineRoomType + express /matchmake/ handler"

requirements-completed: [NTWK-02]

# Metrics
duration: ~60min
completed: 2026-04-08
---

# Phase 10 Plan 02: Colyseus Binary Patch Sync Summary

**Colyseus Schema binary patch sync verified end-to-end: tick counter increments on server flow as binary patches to browser client via @colyseus/sdk 0.17**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-04-08
- **Completed:** 2026-04-08
- **Tasks:** 2 (1 auto, 1 human-verify)
- **Files modified:** 3

## Accomplishments
- Created `client/src/network/ColyseusClient.ts` with `connectToRoom` and `verifySync` exports
- Exposed `window.__verifyColyseusSync` for browser console testing
- Human verified: ticks 0-9 appeared in browser console over 10 seconds, confirming binary patch delivery
- CORS, server routing, and SDK API compatibility issues resolved without breaking existing Express routes

## Task Commits

1. **Task 1: Create client Colyseus connection module and wire sync verification** — `aff3f5e` (feat)
2. **Task 2: Verify Colyseus binary patch sync in browser** — human-verified (no code commit; checkpoint approved)

## Files Created/Modified
- `client/src/network/ColyseusClient.ts` — Colyseus client module with connectToRoom, verifySync, and window.__verifyColyseusSync
- `server/src/index.ts` — Rewritten to use manual /matchmake/ route + matchMaker API; CORS updated to regex localhost pattern with credentials: true
- `client/src/main.tsx` — Side-effect import of ColyseusClient added for verification wiring (renamed from main.ts during React migration)

## Decisions Made
- `onStateChange` used instead of `state.listen` — the latter is not available in @colyseus/sdk 0.17; onStateChange provides the full state snapshot and is adequate for tick verification
- Manual `matchMaker.defineRoomType` + express `/matchmake/` route used instead of `Server.defineServer` — tsx strips class names at runtime causing a room registration conflict with defineServer
- CORS regex pattern (`/^https?:\/\/localhost/`) with `credentials: true` required for Colyseus HTTP upgrade handshake in cross-origin dev setup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CORS updated to allow cross-origin WebSocket upgrade**
- **Found during:** Task 1 (client connection module)
- **Issue:** Browser blocked Colyseus HTTP handshake due to CORS policy; `origin: '*'` doesn't work with `credentials: true` required by Colyseus SDK
- **Fix:** Changed CORS origin to regex `/^https?:\/\/localhost/` with `credentials: true`
- **Files modified:** server/src/index.ts
- **Verification:** Browser connected without CORS errors; tick values appeared in console
- **Committed in:** aff3f5e

**2. [Rule 1 - Bug] Server index.ts rewritten to use manual matchmake route**
- **Found during:** Task 1 (server startup)
- **Issue:** `Server.defineServer` (Colyseus helper) caused a room registration failure — tsx strips class names at runtime, so GameRoom was registered as an anonymous class, and the room name lookup failed
- **Fix:** Used `matchMaker.defineRoomType('game_room', GameRoom)` directly and added a manual `app.all('/matchmake/*', ...)` route to forward requests to Colyseus matchmaker
- **Files modified:** server/src/index.ts
- **Verification:** Room connected successfully; no 404 on matchmake endpoint
- **Committed in:** aff3f5e

**3. [Rule 1 - Bug] ColyseusClient.ts updated to use onStateChange instead of state.listen**
- **Found during:** Task 1 (sync verification)
- **Issue:** `room.state.listen('tick', cb)` is not available in @colyseus/sdk 0.17 — API changed between minor versions
- **Fix:** Used `room.onStateChange((state) => console.log('[Colyseus] tick:', state.tick))` instead
- **Files modified:** client/src/network/ColyseusClient.ts
- **Verification:** Tick values logged correctly in browser console during human-verify checkpoint
- **Committed in:** aff3f5e

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All three fixes were necessary to get any connection working. No scope creep — all changes are within the networking module boundary established in Plan 01.

## Issues Encountered
- `main.ts` had been renamed to `main.tsx` during a React migration (v1.2) that happened before this phase; the side-effect import was added to `main.tsx` accordingly. Not a blocking issue.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Colyseus binary patch sync confirmed working end-to-end
- `connectToRoom` is the stable API surface for Phase 11 lobby/player connection work
- `verifySync` and `window.__verifyColyseusSync` should be removed before Phase 11 ships (dev-only verification artifact)
- Manual matchmake route pattern established — Phase 11 will add more room types using the same pattern

---
*Phase: 10-networking-infrastructure*
*Completed: 2026-04-08*
