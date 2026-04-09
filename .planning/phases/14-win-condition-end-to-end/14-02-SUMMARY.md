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
metrics:
  duration_minutes: 5
  completed_date: "2026-04-09"
  tasks_completed: 2
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

### Task 3: End-to-end verification (checkpoint — pending human verification)

Human verification required: two-tab walkthrough from lobby through winner screen and rematch.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Modified

- [x] `client/src/features/game/GameScreen.tsx` — exists with WinnerOverlay, game_finished handler, round counter
- [x] `client/src/features/lobby/NameInputScreen.tsx` — exists with maxRounds state and 3/5/10 selector
- [x] `client/src/features/lobby/WaitingRoomScreen.tsx` — exists with maxRounds display, no Start Game button

### Commits

- ce40c33: feat(14-02): add WinnerOverlay, round counter, game_finished handler, and return-to-lobby navigation
- 8037871: feat(14-02): add round limit selector, auto-start UI, and maxRounds display

## Self-Check: PASSED
