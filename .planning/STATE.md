---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Entity Interactions & Rounds
status: planning
stopped_at: Completed 06-02-PLAN.md (POST /api/interactions route and tests)
last_updated: "2026-04-08T03:31:40.037Z"
last_activity: 2026-04-07 — v1.1 roadmap created (Phases 6-9)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
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

### Pending Todos

None.

### Blockers/Concerns

- Interaction blend factor (chase/flee velocity weight) is unspecified — determine empirically in Phase 8
- Fight resolution metric (speed comparison) may need tuning — architecture supports swapping without changing sim loop
- Symbiosis UX (drift strength, threshold) is underspecified — defer fine-tuning to post-demo

## Session Continuity

Last session: 2026-04-08T03:31:40.036Z
Stopped at: Completed 06-02-PLAN.md (POST /api/interactions route and tests)
Resume file: None
