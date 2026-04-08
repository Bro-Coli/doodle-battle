# Roadmap: Crayon World

## Overview

v1.0 proved the draw-to-life loop works. v1.2 focuses on migrating visible client UI from imperative Pixi-adjacent DOM assembly into React-managed surfaces without breaking the core drawing, recognition, spawn, and simulation experience. Phase 6 moves the control surface into React. Phase 7 moves recognition overlays into React and verifies gameplay parity after the migration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure** - Monorepo scaffold, API proxy, mock AI mode, browser-accessible with no login (completed 2026-04-07)
- [x] **Phase 2: Drawing Canvas** - Freehand drawing, smooth strokes, undo, clear, PNG export (completed 2026-04-07)
- [x] **Phase 3: Recognition Pipeline** - Submit drawing to Claude Haiku, receive entity profile, loading and error states (completed 2026-04-07)
- [x] **Phase 4: Entity Spawn & Rendering** - Entities appear on canvas with labels and behavior profile display (completed 2026-04-07)
- [x] **Phase 5: Entity Simulation** - Archetype behavior dispatch, delta-time game loop, entities move like themselves (completed 2026-04-07)
- [ ] **Phase 6: React Control Surface** - React-rendered toolbar, brush controls, and mode switching replace imperative client toolbar DOM
- [ ] **Phase 7: React Overlay Parity** - Recognition loading/result/error states move to React and the draw-to-life loop is re-verified

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
**Plans:** 2/2 plans complete
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
**Plans:** 2/2 plans complete
Plans:
- [ ] 03-01-PLAN.md — Server-side Anthropic SDK integration, validation guard, entity cache, and tests
- [ ] 03-02-PLAN.md — Client-side spinner, result card, error toast, mock badge, and submit handler rewrite

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
- [ ] 04-01-PLAN.md — World stage infrastructure, entity sprite rendering (texture capture, labels, shadows, fade-in)
- [ ] 04-02-PLAN.md — Hover tooltips, multi-entity coexistence verification, visual checkpoint

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
- [ ] 05-01-PLAN.md — Speed field in EntityProfile: shared type, Claude prompt, server validation, mock data, tests
- [ ] 05-02-PLAN.md — Entity state types and 6 pure archetype behavior functions (simulation engine)
- [ ] 05-03-PLAN.md — Wire game loop into WorldStage, spreading copy spawns, visual verification

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure | 2/2 | Complete | 2026-04-07 |
| 2. Drawing Canvas | 2/2 | Complete | 2026-04-07 |
| 3. Recognition Pipeline | 2/2 | Complete | 2026-04-07 |
| 4. Entity Spawn & Rendering | 2/2 | Complete | 2026-04-07 |
| 5. Entity Simulation | 3/3 | Complete | 2026-04-07 |
| 6. React Control Surface | 1/2 | In Progress | — |
| 7. React Overlay Parity | 0/0 | Pending | — |
