# Roadmap: Crayon World

## Milestones

- ✅ **v1.0 Single-Player PoC** - Phases 1-5 (shipped 2026-04-07)
- ✅ **v1.2 React UI Migration** - Phases 6-7 (shipped 2026-04-08)
- ✅ **v2.0 Multiplayer** - Phases 10-14 (shipped 2026-04-09)

## Phases

<details>
<summary>✅ v1.0 Single-Player PoC (Phases 1-5) - SHIPPED 2026-04-07</summary>

### Phase 1: Infrastructure
**Goal**: The project foundation exists — multiplayer-ready architecture, API key secured, mock AI mode enabled, browser-accessible with no login
**Plans:** 2/2 plans complete

### Phase 2: Drawing Canvas
**Goal**: Players can draw freehand on the canvas with smooth strokes and recover from mistakes
**Plans:** 2/2 plans complete

### Phase 3: Recognition Pipeline
**Goal**: A drawing submitted to the API returns a validated entity profile — with visible loading state and graceful error handling throughout
**Plans:** 2/2 plans complete

### Phase 4: Entity Spawn & Rendering
**Goal**: Recognized entities appear on the canvas as distinct visual objects with labels and behavior profiles visible to the player
**Plans:** 2/2 plans complete

### Phase 5: Entity Simulation
**Goal**: Every entity on the canvas moves in a way that matches its real-world identity — a wolf walks, a bird flies, a tree stays rooted
**Plans:** 3/3 plans complete

</details>

<details>
<summary>✅ v1.2 React UI Migration (Phases 6-7) - SHIPPED 2026-04-08</summary>

### Phase 6: React Control Surface
**Goal**: The player uses React-rendered controls for the main studio actions while the existing draw/world behavior continues to work
**Plans:** 2/2 plans complete

### Phase 7: React Overlay Parity
**Goal**: Recognition overlays move into React and the full draw-to-life loop still behaves correctly after the UI migration
**Plans:** 1/1 plans complete

</details>

<details>
<summary>✅ v2.0 Multiplayer (Phases 10-14) - SHIPPED 2026-04-09</summary>

### Phase 10: Networking Infrastructure
**Goal**: Colyseus runs alongside Express, shared simulation code is importable by both sides, and state changes sync to all clients via binary patches
**Plans:** 2/2 plans complete — completed 2026-04-08

### Phase 11: Lobby & Players
**Goal**: Players can create or join a room, see who else is in it, know their team, and the host can start the game when enough players are ready
**Plans:** 2/2 plans complete — completed 2026-04-09

### Phase 12: Server-Authoritative Simulation
**Goal**: Entity movement and fight resolution run on the Colyseus server; clients receive positions via Schema patches and render them without running any local simulation
**Plans:** 2/2 plans complete — completed 2026-04-09

### Phase 13: Game Phase Lifecycle & Draw Relay
**Goal**: All players experience a synchronized draw phase (timed, hidden drawings) followed by a simulation phase (all entities revealed simultaneously), repeated each round
**Plans:** 2/2 plans complete — completed 2026-04-09

### Phase 14: Win Condition & End-to-End
**Goal**: The game has a definitive end state — one team wins by elimination or by having more entities when the round limit is reached — and every connected player sees the outcome
**Plans:** 2/2 plans complete — completed 2026-04-09

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-5 | v1.0 | 11/11 | Complete | 2026-04-07 |
| 6-7 | v1.2 | 3/3 | Complete | 2026-04-08 |
| 10-14 | v2.0 | 10/10 | Complete | 2026-04-09 |
