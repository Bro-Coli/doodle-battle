---
phase: 14-win-condition-end-to-end
plan: "02"
subsystem: client-ui
tags: [winner-screen, round-counter, auto-start, lobby, game-loop]
dependency_graph:
  requires: [14-01]
  provides: [winner-overlay, round-limit-selector, auto-start-ui, return-to-lobby]
  affects: [GameScreen, NameInputScreen, WaitingRoomScreen]
tech_stack:
  added: []
  patterns: [phase-aware-overlay, synchronous-message-handler, colyseus-snapshot]
key_files:
  created: []
  modified:
    - client/src/features/game/GameScreen.tsx
    - client/src/features/lobby/NameInputScreen.tsx
    - client/src/features/lobby/WaitingRoomScreen.tsx
decisions:
  - "game_finished handler registered synchronously before async PixiJS init (per RESEARCH.md Pitfall 6 — avoids missed messages during async setup)"
  - "WinnerOverlay uses pointer-events-auto to enable button interaction through the overlay (other overlays are pointer-events-none)"
  - "winnerData reset when phase transitions from idle to draw (not on finished->idle) to keep overlay visible until confirmed new game start"
  - "Start Game button removed entirely — auto-start server behavior replaces it; Ready toggle is now the only lobby action"
  - "Ready toggle shows active state (green + 'Ready!' label) for immediate visual feedback without server roundtrip"
requirements-completed: [WNCN-01, WNCN-02]
metrics:
  duration_minutes: 40
  completed_date: "2026-04-09"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 14 Plan 02: Client Win Condition UI Summary

**One-liner:** Winner overlay with per-player stats, round limit selector (3/5/10), and auto-start lobby replacing the manual Start Game button — completing the full client-side multiplayer game loop.

## What Was Built

### Task 1: WinnerOverlay, round counter, game_finished handler (GameScreen.tsx)

- Extended `GameSnapshot` interface with `currentRound: number` and `maxRounds: number` fields, extracted from Colyseus state in `takeSnapshot()`
- Added `WinnerData` state (`useState<WinnerData | null>(null)`) for the game outcome payload
- Registered `room.onMessage('game_finished', ...)` **synchronously** before the async PixiJS init block to prevent missed messages
- Added `WinnerOverlay` sub-component: full-screen semi-transparent overlay (`bg-black/60`, `pointer-events-auto`) showing winner announcement in team color, per-player stats table (sorted by team then kills desc, current player highlighted), and Back to Lobby / Main Menu buttons
- Updated `DrawPhaseOverlay` to show `Round {currentRound}/{maxRounds}` alongside the countdown timer
- `handleBackToLobby`: sends `return_to_lobby` message then navigates to `/waiting`
- `handleMainMenu`: calls `room.leave()` then navigates to `/`
- `winnerData` resets when phase transitions from `idle` to `draw` (new game detected)
- Overlay renders on `currentPhase === 'finished'` with `winnerData` guard

### Task 2: Round limit selector + auto-start UI (NameInputScreen.tsx, WaitingRoomScreen.tsx)

**NameInputScreen:**
- Added `maxRounds` state (default 5) with three toggle buttons (3, 5, 10) styled to match existing Tailwind aesthetic
- Round limit selector only appears in the `create` flow (joiners don't set game rules)
- `maxRounds` passed to `createRoom({ name, maxPlayers, maxRounds, isPrivate })` in the create handler

**WaitingRoomScreen:**
- Removed `handleStartGame` function and the Start Game button entirely — auto-start is server-side
- Added `maxRounds` to `RoomSnapshot` interface and `takeSnapshot()` extraction
- Displays `Rounds: {maxRounds}` in the room info section alongside player count
- Ready toggle now shows active state (green background + "Ready!" label vs "Ready Up")
- Host sees informational text: "Game starts automatically when all players are ready"

### Task 3: End-to-end verification (checkpoint:human-verify — APPROVED)

Two-tab walkthrough completed: lobby creation with round limit -> auto-start -> draw phase with round counter -> simulate -> results -> repeat -> winner screen -> rematch and main menu flows all verified. User approved.

## Deviations from Plan

Post-verification bugfixes discovered during the two-tab walkthrough:

### Auto-fixed Issues

**1. [Rule 1 - Bug] Round counter showed "Round 0/3" on first draw phase**
- **Found during:** Task 3 verification
- **Issue:** Server's `currentRound` starts at 0 and increments after results phase; client was displaying raw value, yielding "Round 0/3" instead of "Round 1/3"
- **Fix:** Client renders `currentRound + 1` in the draw phase banner
- **Files modified:** `client/src/features/game/GameScreen.tsx`
- **Committed in:** `5a4dcac`

**2. [Rule 1 - Bug] Winner screen dismissed for all players when one clicked Back to Lobby**
- **Found during:** Task 3 verification
- **Issue:** `return_to_lobby` server handler reset phase to 'lobby' for all connected clients, causing WinnerOverlay to unmount for the player who had not yet navigated
- **Fix:** WinnerOverlay persists until each player individually navigates; `winnerData` cleared only on local phase transition back to 'draw'
- **Files modified:** `client/src/features/game/GameScreen.tsx`
- **Committed in:** `74da7cc`

**3. [Rule 1 - Bug] Win condition not triggered on final round — game looped back instead of ending**
- **Found during:** Task 3 verification (playing through to round 3)
- **Issue:** Server incremented `currentRound` before calling `_computeWinner`, so the final round evaluated as round N+1 and the condition `currentRound >= maxRounds` was never true at the right time
- **Fix:** `_computeWinner` called before `currentRound` increment on server
- **Files modified:** `server/src/rooms/GameRoom.ts`
- **Committed in:** `491bfd1`

**4. [Rule 2 - Missing UX] Added 'Final results incoming...' hint on last round results overlay**
- **Found during:** Task 3 verification
- **Issue:** On the final round the ResultsOverlay lingered while the server processed the win condition, with no feedback — players could not tell if the game had stalled
- **Fix:** ResultsOverlay detects `currentRound >= maxRounds` and shows supplementary text: "Final results incoming..."
- **Files modified:** `client/src/features/game/GameScreen.tsx`
- **Committed in:** `a3c4b7c`

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 missing UX feedback)
**Impact on plan:** All fixes required for correct end-to-end game loop and player experience. No scope creep.

## Self-Check

### Files Modified

- [x] `client/src/features/game/GameScreen.tsx` — WinnerOverlay, game_finished handler, round counter, final-round hint
- [x] `client/src/features/lobby/NameInputScreen.tsx` — maxRounds state and 3/5/10 selector
- [x] `client/src/features/lobby/WaitingRoomScreen.tsx` — maxRounds display, no Start Game button

### Commits

- ce40c33: feat(14-02): add WinnerOverlay, round counter, game_finished handler, and return-to-lobby navigation
- 8037871: feat(14-02): add round limit selector, auto-start UI, and maxRounds display
- 74da7cc: fix(14): round counter off-by-one and winner screen dismissed by other player
- 491bfd1: fix(14): check win condition before incrementing round counter
- 5a4dcac: fix(14): simplify round display — show currentRound+1 on client
- a3c4b7c: fix(14): show 'Final results incoming...' on last round results overlay

## Self-Check: PASSED
