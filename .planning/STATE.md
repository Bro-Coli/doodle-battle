---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Entity Interactions & Rounds
status: planning
stopped_at: Phase 9 context gathered
last_updated: "2026-04-08T07:41:53.697Z"
last_activity: 2026-04-07 — v1.1 roadmap created (Phases 6-9)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)

**Core value:** Draw something and it comes alive acting like itself — a wolf that hunts, a bird that flies, a tree that grows. Now entities interact with each other based on AI-determined relationships.
**Current focus:** v1.1 Entity Interactions & Rounds — Phase 6

## Current Position

Phase: 6 of 9 (Shared Types & Interaction Server Route)
Plan: — of — in current phase
Status: Ready to plan
Last activity: 2026-04-07 — v1.1 roadmap created (Phases 6-9)

Progress: [░░░░░░░░░░] 0% (v1.1)

## Performance Metrics

**Velocity (v1.0):**
- Total plans completed: 11
- Timeline: 1 day (2026-04-07)

**By Phase (v1.0):**

| Phase | Plans | Files |
|-------|-------|-------|
| 1. Infrastructure | 2 | 13+4 |
| 2. Drawing Canvas | 2 | 6+3 |
| 3. Recognition Pipeline | 2 | 8+5 |
| 4. Entity Spawn & Rendering | 2 | 6+4 |
| 5. Entity Simulation | 3 | 6+8+1 |
| Phase 06-shared-types-interaction-server-route P01 | 10 | 2 tasks | 4 files |
| Phase 06-shared-types-interaction-server-route P02 | 2min | 2 tasks | 3 files |
| Phase 07-round-state-machine-entity-removal P01 | 2 | 2 tasks | 3 files |
| Phase 07-round-state-machine-entity-removal P02 | 5 | 1 tasks | 2 files |
| Phase 08-interaction-behaviors P01 | 2 | 3 tasks | 2 files |
| Phase 08-interaction-behaviors P02 | 30 | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Full v1.0 decision log in `.planning/milestones/v1.0-ROADMAP.md` and PROJECT.md Key Decisions.

Key v1.1 decisions (from research):
- Use stable integer IDs (not entity names) as keys in the batch interaction prompt — Haiku rewrites names
- `_removeEntity()` is the single legal removal path — prevents five-map leaks
- `RoundPhase` string enum replaces ad-hoc boolean flags — prevents race conditions on double-click
- Entity cap: ~8-10 entities per round for the batch prompt (combinatorial explosion risk above that)
- Single `messages.create` call (not Batches API) — Batches API is async/24h, incompatible with real-time
- [Phase 06-shared-types-interaction-server-route]: Integer IDs as matrix keys — Haiku rewrites entity names, stable IDs prevent lookup failures
- [Phase 06-shared-types-interaction-server-route]: ignoreFallback produces safe all-ignore matrix when both AI retry attempts fail
- [Phase 06-shared-types-interaction-server-route]: Deduplication reducing to 1 unique entity triggers empty-entries short-circuit — consistent semantics regardless of duplicate source
- [Phase 06-shared-types-interaction-server-route]: Route mirrors recognize.ts: mock check after dedup, 2-attempt retry loop, catch returns 502
- [Phase 07-round-state-machine-entity-removal]: RoundPhase has no done state — _endRound() transitions simulating directly to idle
- [Phase 07-round-state-machine-entity-removal]: removeEntity() deletes from all 5 maps before destroy() to prevent leaked GPU texture references
- [Phase 07-round-state-machine-entity-removal]: fetchInteractions failure produces empty-entries fallback (all-ignore) rather than blocking the round
- [Phase 07-round-state-machine-entity-removal]: viewToggleBtn locked during analyzing only — player can peek at draw mode during simulation
- [Phase 07-round-state-machine-entity-removal]: syncStartRoundBtn called in both enableAllToolbar and card dismiss callback to cover all enable paths
- [Phase 07-round-state-machine-entity-removal]: Human verified complete round lifecycle end-to-end: start, analyze spinner, 30s countdown, auto-end, entity persistence across rounds
- [Phase 08-interaction-behaviors]: Generic container type T used for interactionBehaviors — allows testing without PixiJS
- [Phase 08-interaction-behaviors]: befriendPosition linear damping: factor = dist/arriveRadius when dist < arriveRadius
- [Phase 08-interaction-behaviors]: Speed defaults to 80 for archetypes without speed field (rooted, spreading, stationary)
- [Phase 08-interaction-behaviors]: Solid bounce-off-edge walls replace wrap-around — entities stay in view and interactions are visually legible
- [Phase 08-interaction-behaviors]: All distance constants converted to world-diagonal fractions for scale-independence across canvas sizes
- [Phase 08-interaction-behaviors]: 0.5s bounce cooldown suppresses interaction steering after wall collision to prevent corner trapping

### Pending Todos

None.

### Blockers/Concerns

- Interaction blend factor (chase/flee velocity weight) is unspecified — determine empirically in Phase 8
- Fight resolution metric (speed comparison) may need tuning — architecture supports swapping without changing sim loop
- Symbiosis UX (drift strength, threshold) is underspecified — defer fine-tuning to post-demo

## Session Continuity

Last session: 2026-04-08T07:41:53.694Z
Stopped at: Phase 9 context gathered
Resume file: .planning/phases/09-round-ui-end-to-end-integration/09-CONTEXT.md
