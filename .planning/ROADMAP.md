# Roadmap: Crayon World

## Overview

Five phases that build the draw-to-life pipeline from the ground up. Phase 1 lays the multiplayer-ready foundation and secures the API key before any feature work. Phase 2 delivers the drawing canvas. Phase 3 wires the canvas to Claude Haiku and proves the recognition pipeline. Phase 4 makes entities appear and coexist on the canvas. Phase 5 brings entities to life with archetype-appropriate movement. When Phase 5 is complete, the core magic works: draw something, it comes alive acting like itself.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure** - Monorepo scaffold, API proxy, mock AI mode, browser-accessible with no login (completed 2026-04-07)
- [ ] **Phase 2: Drawing Canvas** - Freehand drawing, smooth strokes, undo, clear, PNG export
- [ ] **Phase 3: Recognition Pipeline** - Submit drawing to Claude Haiku, receive entity profile, loading and error states
- [ ] **Phase 4: Entity Spawn & Rendering** - Entities appear on canvas with labels and behavior profile display
- [ ] **Phase 5: Entity Simulation** - Archetype behavior dispatch, delta-time game loop, entities move like themselves

## Phase Details

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
- [ ] 01-01-PLAN.md — Scaffold monorepo with shared types and Express mock AI server
- [ ] 01-02-PLAN.md — PixiJS client with full-viewport canvas, toolbar, and Vite dev proxy

### Phase 2: Drawing Canvas
**Goal**: Players can draw freehand on the canvas with smooth strokes and recover from mistakes
**Depends on**: Phase 1
**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-04
**Success Criteria** (what must be TRUE):
  1. Player can draw on the canvas using mouse or touch input and see strokes appear in real time
  2. Strokes render with smooth, tapered appearance (not jagged pixel lines)
  3. Player can undo the last stroke and see it removed from the canvas
  4. Player can clear the entire canvas with a single action
**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Drawing engine with smooth tapered strokes, undo, clear, and thickness toggle
- [ ] 02-02-PLAN.md — PNG export, submit button wiring, and visual verification

### Phase 3: Recognition Pipeline
**Goal**: A drawing submitted to the API returns a validated entity profile — with visible loading state and graceful error handling throughout
**Depends on**: Phase 2
**Requirements**: RECG-01, RECG-02, RECG-03, RECG-04
**Success Criteria** (what must be TRUE):
  1. Pressing submit sends the canvas as PNG to the API proxy and Claude Haiku returns an entity label using open vocabulary
  2. A loading indicator is visible from the moment submit is pressed until the profile arrives
  3. If the drawing is unrecognized or the API fails, the player sees a meaningful fallback message rather than a silent error
  4. The returned entity profile is validated and typed — unknown archetypes map to a default, malformed JSON does not crash the client
**Plans**: TBD

### Phase 4: Entity Spawn & Rendering
**Goal**: Recognized entities appear on the canvas as distinct visual objects with labels and behavior profiles visible to the player
**Depends on**: Phase 3
**Requirements**: ENTY-01, ENTY-03, ENTY-04, RECG-05
**Success Criteria** (what must be TRUE):
  1. After recognition completes, an entity spawns as a distinct visual object on the canvas
  2. The entity's name label floats visibly above its sprite
  3. The entity's behavior profile (traits, role) is displayed to the player at spawn time
  4. Multiple entities from multiple draws coexist on the canvas simultaneously without replacing each other
**Plans**: TBD

### Phase 5: Entity Simulation
**Goal**: Every entity on the canvas moves in a way that matches its real-world identity — a wolf walks, a bird flies, a tree stays rooted
**Depends on**: Phase 4
**Requirements**: ENTY-02
**Success Criteria** (what must be TRUE):
  1. All six archetypes (walking, flying, rooted, spreading, drifting, stationary) produce visibly distinct movement patterns
  2. Entity movement is driven by delta-time so motion is frame-rate independent
  3. Drawing a wolf, a bird, and a tree produces three entities each moving in recognizably identity-appropriate ways simultaneously
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure | 2/2 | Complete   | 2026-04-07 |
| 2. Drawing Canvas | 0/2 | Planning complete | - |
| 3. Recognition Pipeline | 0/? | Not started | - |
| 4. Entity Spawn & Rendering | 0/? | Not started | - |
| 5. Entity Simulation | 0/? | Not started | - |
