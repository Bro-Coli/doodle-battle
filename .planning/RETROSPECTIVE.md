# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Single-Player PoC

**Shipped:** 2026-04-07
**Phases:** 5 | **Plans:** 11

### What Was Built
- Full draw-to-life pipeline: freehand drawing → Claude Haiku recognition → entity spawn → archetype-based movement
- 6 distinct movement archetypes (walking wander, flying arcs, rooted sway, spreading copies, drifting float, stationary)
- AI-provided speed field (1-10) for identity-appropriate movement pace
- 47 automated tests across server validation, mock entities, and behavior functions
- Monorepo architecture (client/server/shared) ready for Colyseus multiplayer

### What Worked
- Pure behavior functions (no PixiJS imports) made behavior logic trivially unit-testable in Node environment
- Discuss-phase workflow captured critical design decisions upfront (e.g., spreading = spawn copies, not scale growth) preventing mid-implementation rework
- Wave-based parallel execution — Plans 05-01 (speed field) and 05-02 (behaviors) had zero file overlap, ran simultaneously
- TDD approach caught validation edge cases early (speed clamping, missing fields default to safe values)
- Entity texture capture ordering (spawn before canvas clear) was a non-obvious but critical sequencing decision caught during Phase 4 planning

### What Was Inefficient
- Phases 1-4 pre-dated Nyquist validation adoption — retroactive compliance would require `/gsd:validate-phase` for each
- Import path inconsistency (`@crayon-world/shared` vs `@crayon-world/shared/src/types`) crept in across phases — should standardize early
- STATE.md performance metrics didn't auto-update cleanly — accumulated stale data from early phases

### Patterns Established
- HTML overlay for UI (toolbar, tooltips, overlays) + PixiJS for game rendering — clean separation
- `create-on-show, remove-on-dismiss` DOM pattern for overlays (RecognitionOverlay, EntityTooltip)
- Named exports preferred over default exports (module cache compatibility)
- No top-level await in client code (Vite production build requirement)
- PixiJS v8: `new Application()` then `await app.init()`, never constructor options
- Behavior functions: `(state, dt, world) => state` pure contract for Colyseus compatibility

### Key Lessons
1. Capturing design decisions before planning (discuss-phase) prevents the most expensive rework — mid-implementation direction changes
2. Pure functions with no framework imports are the easiest path to testability
3. Single shared ticker (not per-entity) is critical for PixiJS performance — the per-entity pattern from fade-in animation should not be copied for persistent loops
4. `deltaMS / 1000` (not `deltaTime`) for correct frame-rate independence across all refresh rates

### Cost Observations
- Model mix: ~60% sonnet (research, execution, verification), ~40% opus (orchestration, planning)
- Full milestone completed in a single day
- Notable: Wave-based parallel execution saved ~50% wall-clock time on Phase 5

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 11 | Established GSD workflow with discuss → plan → execute → verify pipeline |

### Cumulative Quality

| Milestone | Tests | Nyquist Phases | Zero-Dep Additions |
|-----------|-------|----------------|-------------------|
| v1.0 | 47 | 1/5 (Phase 5 only) | 1 (pixi-filters) |

### Top Lessons (Verified Across Milestones)

1. Design decisions captured upfront prevent the most expensive rework
2. Pure functions with no framework imports maximize testability
