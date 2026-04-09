---
phase: 11-lobby-players
plan: 01
subsystem: api
tags: [colyseus, schema, websocket, multiplayer, lobby]

# Dependency graph
requires:
  - phase: 10-networking-infrastructure
    provides: Colyseus Server and GameRoom skeleton with working WebSocket transport

provides:
  - PlayerSchema (name/team/ready) synced via Colyseus Schema decorators
  - GameState (players MapSchema, hostSessionId, maxPlayers)
  - 4-char alphanumeric room code generation (unambiguous charset)
  - Team auto-assignment balancing red/blue; tie breaks to red
  - Host tracking and re-assignment on host leave
  - toggle_ready message handler flipping player ready boolean
  - start_game message handler guarded by host check and minimum 2 clients

affects: [11-02-client-lobby-screen, 12-server-authoritative-simulation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Colyseus Schema decorators on PlayerSchema and GameState for automatic state sync
    - MapSchema<PlayerSchema> keyed by sessionId for per-player state
    - Room<{ state: GameState }> generic typing for Colyseus 0.17
    - Exposed _handle* methods for unit-testable message handlers without onMessage mocking
    - TDD: failing tests committed before implementation

key-files:
  created:
    - server/tests/gameRoom.test.ts
  modified:
    - server/src/rooms/GameRoom.ts

key-decisions:
  - "Colyseus 0.17 Room generic is Room<{ state: T }> not Room<T> — state must be wrapped in RoomOptions shape"
  - "onLeave signature is (client, code?: number) not (client, consented: boolean) in Colyseus 0.17"
  - "Message handlers extracted to _handle* methods so tests can call them directly without mocking onMessage infrastructure"
  - "Unambiguous charset ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no 0/O/I/1) for room codes"

patterns-established:
  - "Colyseus Schema: use Room<{ state: GameState }> generic typing in Colyseus 0.17"
  - "Testable handlers: prefix with _handle* to allow direct invocation in Vitest without server startup"

requirements-completed: [LBBY-01, LBBY-02, LBBY-03, TEAM-01, TEAM-02, TEAM-03]

# Metrics
duration: 15min
completed: 2026-04-09
---

# Phase 11 Plan 01: Lobby Players Summary

**GameRoom replaced PingState with full lobby state: PlayerSchema (name/team/ready), GameState with MapSchema, 4-char room code, team auto-assignment, host tracking, ready toggle, and start-game guard — all covered by 19 Vitest unit tests**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-09T03:39:41Z
- **Completed:** 2026-04-09T03:54:00Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 2

## Accomplishments

- Replaced PingState skeleton with production lobby state (PlayerSchema + GameState + MapSchema)
- 4-char room code generator using unambiguous character set (no 0/O/1/I confusion)
- Team auto-assignment (red/blue balance, red on tie) and host re-assignment on host leave
- toggle_ready and start_game handlers with proper guards
- 19 unit tests covering all pure helpers and lifecycle events; full 107-test suite still passing

## Task Commits

1. **Task 1 RED: Failing tests** - `388a8c0` (test)
2. **Task 1 GREEN: GameRoom implementation** - `6f7745f` (feat)

## Files Created/Modified

- `server/src/rooms/GameRoom.ts` - Replaced PingState with PlayerSchema, GameState, and full GameRoom lifecycle
- `server/tests/gameRoom.test.ts` - 19 unit tests for schema defaults, pure helpers, and lifecycle

## Decisions Made

- Colyseus 0.17 requires `Room<{ state: GameState }>` generic typing (not `Room<GameState>`) — discovered via TypeScript check
- `onLeave` signature is `(client, code?: number)` not `(client, consented: boolean)` — fixed tests accordingly
- Message handlers extracted to `_handleToggleReady` and `_handleStartGame` methods so they can be unit-tested without spinning up a real Colyseus server

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Colyseus 0.17 generic and onLeave signature**
- **Found during:** Task 1 (TypeScript type check after implementation)
- **Issue:** `Room<GameState>` fails — Colyseus 0.17 expects `Room<{ state: T }>`. `onLeave` parameter is `code?: number` not `boolean`.
- **Fix:** Changed generic to `Room<{ state: GameState }>`, updated `onLeave` signature, updated tests to omit consented argument
- **Files modified:** server/src/rooms/GameRoom.ts, server/tests/gameRoom.test.ts
- **Verification:** `npx tsc --noEmit` clean (excluding pre-existing shared/ errors), all 19 tests pass
- **Committed in:** 6f7745f (Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — Colyseus API type mismatch)
**Impact on plan:** Fix was required for correctness; no scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in shared/src/simulation/ files (out of scope, not fixed)

## Next Phase Readiness

- GameRoom is ready for Plan 02 (client lobby screens) — PlayerSchema fields (name, team, ready) and hostSessionId are Schema-synced and available via onStateChange
- start_game broadcasts `game_starting` which Plan 13 (game phase lifecycle) will handle

---
*Phase: 11-lobby-players*
*Completed: 2026-04-09*
