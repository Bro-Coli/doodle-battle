# Requirements: Crayon World

**Defined:** 2026-04-08
**Core Value:** The moment you draw something and it comes alive acting like itself — now in real-time multiplayer with teams.

## v2.0 Requirements

Requirements for Colyseus multiplayer. Each maps to roadmap phases.

### Networking Infrastructure

- [x] **NTWK-01**: Colyseus server runs alongside Express on the same port, existing `/api/recognize` and `/api/interactions` routes still work
- [x] **NTWK-02**: Schema state syncs from server to all connected clients via Colyseus binary patches
- [x] **NTWK-03**: Behavior functions live in `shared/` and are importable by both server simulation and client code

### Lobby & Matchmaking

- [x] **LBBY-01**: A player can create a new game room (public or private)
- [x] **LBBY-02**: A player can join a private room using a 4-character alphanumeric code
- [x] **LBBY-03**: Rooms support 2-8 players with a configurable player limit
- [x] **LBBY-04**: Players see a lobby screen with the room code and connected player list

### Teams & Players

- [x] **TEAM-01**: Players are auto-assigned to one of two teams on join, balanced by count
- [x] **TEAM-02**: Each player has a visible name, team assignment, and ready status in the lobby
- [x] **TEAM-03**: The host (first player to join) can start the game when at least 2 players are connected

### Game Phase Lifecycle

- [x] **PHSE-01**: The game alternates between draw phase and simulation phase, synchronized for all players
- [x] **PHSE-02**: Draw phase has a countdown timer (~60s) and ends early when all players submit or click ready
- [x] **PHSE-03**: Each player submits exactly one drawing per draw phase, hidden from other players until simulation
- [x] **PHSE-04**: Simulation phase runs for ~30 seconds with all entities visible to all players

### Server-Authoritative Simulation

- [x] **SSIM-01**: Entity simulation (movement, interactions) runs on the Colyseus server, not the client
- [x] **SSIM-02**: Clients receive entity positions via Schema patches and render them without local simulation
- [x] **SSIM-03**: Fight resolution and entity removal are determined server-side

### Drawing Relay & Reveal

- [x] **DRAW-01**: Player sends drawing PNG to server via Colyseus room message (not Schema state)
- [x] **DRAW-02**: Server calls Claude Haiku recognition internally for each submitted drawing
- [x] **DRAW-03**: All new entities are revealed simultaneously to all players at simulation phase start

### Win Condition

- [x] **WNCN-01**: Game ends when one team has zero surviving entities (elimination) or after a configurable round limit
- [x] **WNCN-02**: At game end, the team with more surviving entities wins; a winner screen is shown to all players

## v3 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Polish & Social

- **POLH-01**: Public room browser (LobbyRoom-based)
- **POLH-02**: Reconnection support (token-based, 60s window)
- **POLH-03**: Crayon aesthetic with paper texture
- **POLH-04**: Sound design
- **POLH-05**: Spectator mode

### Advanced Gameplay

- **ADVG-01**: Scenario system with context injection into AI recognition
- **ADVG-02**: Trait-influenced movement patterns
- **ADVG-03**: Entity health bars (HP > 1)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time drawing sync (see opponents draw live) | Destroys the hidden-drawing strategic mechanic |
| Persistent accounts / login | Stateless sessions for hackathon scope |
| Spectator mode | Not needed for 2-8 player games |
| Voice/text chat | Use external tools (Discord) |
| Mobile-specific input | Desktop browser first |
| AI-generated entity artwork | Too slow/expensive for real-time multiplayer |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NTWK-01 | Phase 10 | Complete |
| NTWK-02 | Phase 10 | Complete |
| NTWK-03 | Phase 10 | Complete |
| LBBY-01 | Phase 11 | Complete |
| LBBY-02 | Phase 11 | Complete |
| LBBY-03 | Phase 11 | Complete |
| LBBY-04 | Phase 11 | Complete |
| TEAM-01 | Phase 11 | Complete |
| TEAM-02 | Phase 11 | Complete |
| TEAM-03 | Phase 11 | Complete |
| PHSE-01 | Phase 13 | Complete |
| PHSE-02 | Phase 13 | Complete |
| PHSE-03 | Phase 13 | Complete |
| PHSE-04 | Phase 13 | Complete |
| SSIM-01 | Phase 12 | Complete |
| SSIM-02 | Phase 12 | Complete |
| SSIM-03 | Phase 12 | Complete |
| DRAW-01 | Phase 13 | Complete |
| DRAW-02 | Phase 13 | Complete |
| DRAW-03 | Phase 13 | Complete |
| WNCN-01 | Phase 14 | Complete |
| WNCN-02 | Phase 14 | Complete |

**Coverage:**
- v2.0 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Traceability updated: 2026-04-08*
