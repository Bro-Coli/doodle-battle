# Roadmap: Crayon World

## Milestones

- ✅ **v1.0 Single-Player PoC** - Phases 1-5 (shipped 2026-04-07)
- ✅ **v1.2 React UI Migration** - Phases 6-7 (shipped 2026-04-08)
- 🚧 **v2.0 Multiplayer** - Phases 10-14 (in progress)

## Phases

<details>
<summary>✅ v1.0 Single-Player PoC (Phases 1-5) - SHIPPED 2026-04-07</summary>

### Phase 1: Infrastructure
**Goal**: The project foundation exists — multiplayer-ready architecture, API key secured, mock AI mode enabled, browser-accessible with no login
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. Opening the app URL in a browser loads a blank PixiJS canvas with no install or login required
  2. A POST to the API proxy returns a valid mock entity profile when `MOCK_AI=true` is set, with no Anthropic API key in the browser bundle
  3. The client/server/shared directory structure exists with typed interfaces in `shared/types.ts`
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Scaffold monorepo with shared types and Express mock AI server
- [x] 01-02-PLAN.md — PixiJS client with full-viewport canvas, toolbar, and Vite dev proxy

### Phase 2: Drawing Canvas
**Goal**: Players can draw freehand on the canvas with smooth strokes and recover from mistakes
**Depends on**: Phase 1
**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-04
**Success Criteria** (what must be TRUE):
  1. Player can draw on the canvas using mouse or touch input and see strokes appear in real time
  2. Strokes render with smooth, tapered appearance (not jagged pixel lines)
  3. Player can undo the last stroke and see it removed from the canvas
  4. Player can clear the entire canvas with a single action
**Plans:** 2/2 plans complete
Plans:
- [x] 02-01-PLAN.md — Drawing engine with smooth tapered strokes, undo, clear, and thickness toggle
- [x] 02-02-PLAN.md — PNG export, submit button wiring, and visual verification

### Phase 3: Recognition Pipeline
**Goal**: A drawing submitted to the API returns a validated entity profile — with visible loading state and graceful error handling throughout
**Depends on**: Phase 2
**Requirements**: RECG-01, RECG-02, RECG-03, RECG-04
**Success Criteria** (what must be TRUE):
  1. Pressing submit sends the canvas as PNG to the API proxy and Claude Haiku returns an entity label using open vocabulary
  2. A loading indicator is visible from the moment submit is pressed until the profile arrives
  3. If the drawing is unrecognized or the API fails, the player sees a meaningful fallback message rather than a silent error
  4. The returned entity profile is validated and typed — unknown archetypes map to a default, malformed JSON does not crash the client
**Plans:** 2/2 plans complete
Plans:
- [x] 03-01-PLAN.md — Server-side Anthropic SDK integration, validation guard, entity cache, and tests
- [x] 03-02-PLAN.md — Client-side spinner, result card, error toast, mock badge, and submit handler rewrite

### Phase 4: Entity Spawn & Rendering
**Goal**: Recognized entities appear on the canvas as distinct visual objects with labels and behavior profiles visible to the player
**Depends on**: Phase 3
**Requirements**: ENTY-01, ENTY-03, ENTY-04, RECG-05
**Success Criteria** (what must be TRUE):
  1. After recognition completes, an entity spawns as a distinct visual object on the canvas
  2. The entity's name label floats visibly above its sprite
  3. The entity's behavior profile (traits, role) is displayed to the player at spawn time
  4. Multiple entities from multiple draws coexist on the canvas simultaneously without replacing each other
**Plans:** 2/2 plans complete
Plans:
- [x] 04-01-PLAN.md — World stage infrastructure, entity sprite rendering (texture capture, labels, shadows, fade-in)
- [x] 04-02-PLAN.md — Hover tooltips, multi-entity coexistence verification, visual checkpoint

### Phase 5: Entity Simulation
**Goal**: Every entity on the canvas moves in a way that matches its real-world identity — a wolf walks, a bird flies, a tree stays rooted
**Depends on**: Phase 4
**Requirements**: ENTY-02
**Success Criteria** (what must be TRUE):
  1. All six archetypes (walking, flying, rooted, spreading, drifting, stationary) produce visibly distinct movement patterns
  2. Entity movement is driven by delta-time so motion is frame-rate independent
  3. Drawing a wolf, a bird, and a tree produces three entities each moving in recognizably identity-appropriate ways simultaneously
**Plans:** 3/3 plans complete
Plans:
- [x] 05-01-PLAN.md — Speed field in EntityProfile: shared type, Claude prompt, server validation, mock data, tests
- [x] 05-02-PLAN.md — Entity state types and 6 pure archetype behavior functions (simulation engine)
- [x] 05-03-PLAN.md — Wire game loop into WorldStage, spreading copy spawns, visual verification

</details>

<details>
<summary>✅ v1.2 React UI Migration (Phases 6-7) - SHIPPED 2026-04-08</summary>

### Phase 6: React Control Surface
**Goal**: The player uses React-rendered controls for the main studio actions while the existing draw/world behavior continues to work
**Depends on**: Phase 5
**Requirements**: UIM-01, UIM-03, UIM-04
**Success Criteria** (what must be TRUE):
  1. Submit, Undo, Clear, and draw/world mode toggle are rendered by React instead of imperative toolbar DOM assembly
  2. Brush thickness controls are rendered by React and still change drawing behavior correctly
  3. The player can still switch between draw mode and world mode without breaking stage visibility or interaction state
  4. The client entrypoint no longer creates the toolbar directly through `document.createElement`
**Plans:** 1/2 plans complete
Plans:
- [x] 06-01-PLAN.md — React bootstrap, controller bridge, and main.ts integration
- [ ] 06-02-PLAN.md — React toolbar rendering, styling parity, and browser verification

### Phase 7: React Overlay Parity
**Goal**: Recognition overlays move into React and the full draw-to-life loop still behaves correctly after the UI migration
**Depends on**: Phase 6
**Requirements**: UIM-02, UIM-05
**Success Criteria** (what must be TRUE):
  1. Recognition loading, result, and error states render through React components instead of imperative DOM overlays
  2. A successful recognition still leads to the same spawn flow after the user accepts the result
  3. Failed recognition still exposes retry and dismiss behavior that the player can use
  4. Drawing, recognition, entity spawn, and simulation continue to work after the overlay migration
**Plans:** 0/0 plans complete
Plans:
- [ ] 07-01-PLAN.md — Pending planning

</details>

---

### 🚧 v2.0 Multiplayer (In Progress)

**Milestone Goal:** Turn the single-player PoC into a real-time multiplayer game with lobbies, teams, synchronized draw/simulate phases, and server-authoritative simulation via Colyseus.

- [x] **Phase 10: Networking Infrastructure** - Colyseus server integrated alongside Express; shared simulation module; state sync via binary patches (completed 2026-04-08)
- [ ] **Phase 11: Lobby & Players** - Players create/join rooms with a 4-char code, see connected players, get auto-assigned to balanced teams, and host can start when ready
- [ ] **Phase 12: Server-Authoritative Simulation** - Entity simulation moves to the Colyseus server; clients render from Schema patches without running local simulation
- [ ] **Phase 13: Game Phase Lifecycle & Draw Relay** - Synchronized draw/simulate phases with countdown timer; drawings submitted and hidden until reveal; all entities revealed simultaneously
- [ ] **Phase 14: Win Condition & End-to-End** - Game ends by elimination or round limit; winner screen shown to all players; full multiplayer loop verified end-to-end

## Phase Details

### Phase 10: Networking Infrastructure
**Goal**: Colyseus runs alongside Express, shared simulation code is importable by both sides, and state changes sync to all clients via binary patches
**Depends on**: Phase 7
**Requirements**: NTWK-01, NTWK-02, NTWK-03
**Success Criteria** (what must be TRUE):
  1. Opening the app while the server runs shows a browser connection to Colyseus without errors, and existing `/api/recognize` routes still respond correctly
  2. A Colyseus room Schema update on the server produces a binary patch that a connected client receives and applies without writing custom serialization code
  3. Behavior functions from `shared/` can be imported by both the Colyseus server simulation loop and the client rendering code without circular dependency errors
**Plans:** 2/2 plans complete
Plans:
- [ ] 10-01-PLAN.md — Move simulation to shared package, install Colyseus, rewire server
- [ ] 10-02-PLAN.md — Client Colyseus SDK connection and binary patch sync verification

### Phase 11: Lobby & Players
**Goal**: Players can create or join a room, see who else is in it, know their team, and the host can start the game when enough players are ready
**Depends on**: Phase 10
**Requirements**: LBBY-01, LBBY-02, LBBY-03, LBBY-04, TEAM-01, TEAM-02, TEAM-03
**Success Criteria** (what must be TRUE):
  1. A player can create a new room and receive a 4-character room code they can share with others
  2. A second player can join the room by entering the 4-character code and land on a lobby screen showing both players and the room code
  3. Players joining are auto-assigned to teams so both teams stay as balanced as possible as the player count grows toward 8
  4. Each player sees their own name, team color, and ready status — and can see the same for every other player in the lobby
  5. The host sees a "Start Game" button that becomes enabled only when at least 2 players are connected
**Plans**: TBD

### Phase 12: Server-Authoritative Simulation
**Goal**: Entity movement and fight resolution run on the Colyseus server; clients receive positions via Schema patches and render them without running any local simulation
**Depends on**: Phase 11
**Requirements**: SSIM-01, SSIM-02, SSIM-03
**Success Criteria** (what must be TRUE):
  1. An entity spawned in a room moves on screen for all connected clients simultaneously, driven entirely by server tick logic — no client behavior functions run during simulation
  2. Opening the network inspector shows entity position data arriving as binary patch messages, not full-state JSON on every tick
  3. When a fight is resolved server-side, the defeated entity disappears from all connected clients' screens at the same time
**Plans**: TBD

### Phase 13: Game Phase Lifecycle & Draw Relay
**Goal**: All players experience a synchronized draw phase (timed, hidden drawings) followed by a simulation phase (all entities revealed simultaneously), repeated each round
**Depends on**: Phase 12
**Requirements**: PHSE-01, PHSE-02, PHSE-03, PHSE-04, DRAW-01, DRAW-02, DRAW-03
**Success Criteria** (what must be TRUE):
  1. After host starts the game, all players enter draw phase simultaneously and see the same countdown timer
  2. A player can draw and submit exactly one drawing during the draw phase — further submit attempts are blocked; opponents see no preview of the drawing
  3. The draw phase ends when all players have submitted or the countdown reaches zero, whichever comes first
  4. When simulation phase begins, all entities from all players' drawings appear on screen for every connected client at the same moment
  5. Simulation runs for ~30 seconds and all players watch the same entity world simultaneously
**Plans**: TBD

### Phase 14: Win Condition & End-to-End
**Goal**: The game has a definitive end state — one team wins by elimination or by having more entities when the round limit is reached — and every connected player sees the outcome
**Depends on**: Phase 13
**Requirements**: WNCN-01, WNCN-02
**Success Criteria** (what must be TRUE):
  1. When one team's last entity is eliminated, the game ends immediately and all players see a winner screen naming the winning team
  2. When the configured round limit is reached without full elimination, the team with more surviving entities wins and all players see the winner screen
  3. Two players can complete a full loop — lobby → draw → simulate → outcome → back to lobby — without a page refresh
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12 → 13 → 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure | v1.0 | 2/2 | Complete | 2026-04-07 |
| 2. Drawing Canvas | v1.0 | 2/2 | Complete | 2026-04-07 |
| 3. Recognition Pipeline | v1.0 | 2/2 | Complete | 2026-04-07 |
| 4. Entity Spawn & Rendering | v1.0 | 2/2 | Complete | 2026-04-07 |
| 5. Entity Simulation | v1.0 | 3/3 | Complete | 2026-04-07 |
| 6. React Control Surface | v1.2 | 1/2 | Complete | 2026-04-08 |
| 7. React Overlay Parity | v1.2 | 0/0 | Complete | 2026-04-08 |
| 10. Networking Infrastructure | 2/2 | Complete    | 2026-04-08 | — |
| 11. Lobby & Players | v2.0 | 0/TBD | Not started | — |
| 12. Server-Authoritative Simulation | v2.0 | 0/TBD | Not started | — |
| 13. Game Phase Lifecycle & Draw Relay | v2.0 | 0/TBD | Not started | — |
| 14. Win Condition & End-to-End | v2.0 | 0/TBD | Not started | — |
