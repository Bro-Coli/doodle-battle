# Roadmap: Crayon World

## Milestones

- ✅ **v1.0 Single-Player PoC** — Phases 1-5 (shipped 2026-04-07)
- 🚧 **v1.1 Entity Interactions & Rounds** — Phases 6-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 Single-Player PoC (Phases 1-5) — SHIPPED 2026-04-07</summary>

- [x] Phase 1: Infrastructure (2/2 plans) — completed 2026-04-07
- [x] Phase 2: Drawing Canvas (2/2 plans) — completed 2026-04-07
- [x] Phase 3: Recognition Pipeline (2/2 plans) — completed 2026-04-07
- [x] Phase 4: Entity Spawn & Rendering (2/2 plans) — completed 2026-04-07
- [x] Phase 5: Entity Simulation (3/3 plans) — completed 2026-04-07

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Entity Interactions & Rounds (In Progress)

**Milestone Goal:** Entities interact with each other based on AI-determined relationships, driven by a round-based system. The core loop becomes: draw entities, start round, watch them interact, survive, repeat.

- [x] **Phase 6: Shared Types & Interaction Server Route** - New shared types and POST /api/interactions route with mock path (completed 2026-04-08)
- [x] **Phase 7: Round State Machine & Entity Removal** - RoundPhase enum, round lifecycle, safe entity removal infrastructure (completed 2026-04-08)
- [x] **Phase 8: Interaction Behaviors** - Chase/flee/symbiosis/fight pure functions wired into the WorldStage game tick (completed 2026-04-08)
- [ ] **Phase 9: Round UI & End-to-End Integration** - InteractionOverlay with Start Round button, countdown, and outcome card

## Phase Details

### Phase 6: Shared Types & Interaction Server Route
**Goal**: The API contract for interaction analysis exists and is independently testable before any client code is written
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: BATC-01, BATC-02, BATC-03
**Success Criteria** (what must be TRUE):
  1. `POST /api/interactions` accepts an array of entity profiles and returns a relationship matrix classifying each entity pair as chase/flee, fight, symbiosis, or ignore
  2. Mock mode (`MOCK_AI=true`) returns canned relationship data without calling the Anthropic API
  3. The server route can be exercised with a test HTTP call and returns a valid, parseable response for 2-8 entities
  4. `InteractionType`, `EntityRelationship`, and `InteractionMatrix` are exported from `shared/src/types.ts` and importable by both client and server
**Plans:** 2/2 plans complete
Plans:
- [ ] 06-01-PLAN.md — Shared interaction types, prompt builder, response validator, mock matrix
- [ ] 06-02-PLAN.md — POST /api/interactions route, Express registration, test suite

### Phase 7: Round State Machine & Entity Removal
**Goal**: The game knows which phase of a round it is in, and entities can be safely removed from all data structures without leaving ghost state
**Depends on**: Phase 6
**Requirements**: ROUND-01, ROUND-02, ROUND-03, REMV-01, REMV-02
**Success Criteria** (what must be TRUE):
  1. WorldStage tracks a `RoundPhase` of idle/analyzing/simulating/done — no ad-hoc boolean flags
  2. A round automatically ends after ~30 seconds of simulation and transitions back to idle
  3. Calling `removeEntity()` on a defeated entity removes it from the PixiJS stage, all five WorldStage maps, and releases GPU texture references with no leaked state
  4. Entities marked as dying stop moving and no longer participate in interaction resolution
  5. Surviving entities remain in the world after a round ends and are present at the start of the next round
**Plans:** 2/2 plans complete
Plans:
- [ ] 07-01-PLAN.md — RoundPhase state machine, entity removal, fetchInteractions helper, RoundOverlay
- [ ] 07-02-PLAN.md — Start Round button wiring, toolbar gating, view auto-switching, visual verification

### Phase 8: Interaction Behaviors
**Goal**: Entities actively respond to their AI-determined relationships — predators chase, prey flees, hostiles fight, allies drift together, and neutral entities ignore each other
**Depends on**: Phase 7
**Requirements**: INTR-01, INTR-02, INTR-03, INTR-04, INTR-05
**Success Criteria** (what must be TRUE):
  1. A predator entity visibly steers toward its prey target during a round simulation
  2. A prey entity visibly steers away from its predator when the predator is nearby
  3. When two hostile entities come within proximity range, the slower one fades out and is removed from the world
  4. Symbiotic entities drift toward each other and remain near each other during simulation
  5. Entities with no relationship to any other entity continue their archetype movement undisturbed
**Plans:** 2/2 plans complete
Plans:
- [ ] 08-01-PLAN.md — TDD: Pure interaction behavior functions (steering, resolution, state application) with tests
- [ ] 08-02-PLAN.md — WorldStage integration: HP map, name-ID map, fight cooldowns, _gameTick wiring, visual verification

### Phase 9: Round UI & End-to-End Integration
**Goal**: The full round flow is playable end-to-end — a player can draw entities, start a round, watch analysis and simulation, see who survives, and draw again
**Depends on**: Phase 8
**Requirements**: ROUND-04
**Success Criteria** (what must be TRUE):
  1. A "Start Round" button is visible after entities have been spawned and clicking it triggers interaction analysis
  2. The UI clearly shows each round phase — a spinner during AI analysis, a countdown timer during simulation, and a summary card at round end
  3. The complete loop is playable: draw → start round → analyze → simulate → outcome → draw more → start round again
  4. Double-clicking Start Round does not trigger multiple analysis calls
**Plans:** 1 plan
Plans:
- [ ] 09-01-PLAN.md — Outcome card, delayed draw-mode switch, E2E round lifecycle verification

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure | v1.0 | 2/2 | Complete | 2026-04-07 |
| 2. Drawing Canvas | v1.0 | 2/2 | Complete | 2026-04-07 |
| 3. Recognition Pipeline | v1.0 | 2/2 | Complete | 2026-04-07 |
| 4. Entity Spawn & Rendering | v1.0 | 2/2 | Complete | 2026-04-07 |
| 5. Entity Simulation | v1.0 | 3/3 | Complete | 2026-04-07 |
| 6. Shared Types & Interaction Server Route | 2/2 | Complete   | 2026-04-08 | - |
| 7. Round State Machine & Entity Removal | 2/2 | Complete   | 2026-04-08 | - |
| 8. Interaction Behaviors | 2/2 | Complete   | 2026-04-08 | - |
| 9. Round UI & End-to-End Integration | v1.1 | 0/1 | Planning | - |
