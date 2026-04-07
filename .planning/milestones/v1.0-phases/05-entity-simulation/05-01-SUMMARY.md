---
phase: 05-entity-simulation
plan: 01
subsystem: api
tags: [typescript, entity-profile, validation, mock-data, claude-haiku]

# Dependency graph
requires:
  - phase: 04-entity-spawn-rendering
    provides: EntityProfile type consumed by client WorldStage and EntityManager
provides:
  - EntityProfile with speed: number field (1-10 scale)
  - Server validation clamping/defaulting speed for any Claude response
  - Claude Haiku prompt requesting speed in JSON schema
  - 6 mock entities with identity-appropriate speed values
affects: [05-02-entity-simulation, client world simulation engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Numeric field validation: clamp to range + round + default for non-number inputs"
    - "TDD RED/GREEN for type extension — write failing tests then implement"

key-files:
  created: []
  modified:
    - shared/src/types.ts
    - server/src/recognition/buildPrompt.ts
    - server/src/recognition/validateProfile.ts
    - server/src/mock-entities.ts
    - server/tests/validateProfile.test.ts
    - server/tests/mock.test.ts

key-decisions:
  - "speed field clamped and rounded server-side so simulation engine receives clean integer 1-10"
  - "missing or non-number speed defaults to 5 (neutral middle of scale) rather than rejecting the entity"

patterns-established:
  - "Numeric range clamping: Math.round(Math.max(min, Math.min(max, rawValue))) pattern for validated numeric fields"

requirements-completed: [ENTY-02]

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 5 Plan 01: Speed Field for EntityProfile Summary

**`speed: number` (1-10) added to EntityProfile, propagated through Claude prompt schema, server validation (clamp/round/default), and all 6 mock entities**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-07T07:47:43Z
- **Completed:** 2026-04-07T07:49:55Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `EntityProfile` extended with `speed: number` — the simulation engine's input for pixels/second movement
- Claude Haiku prompt updated to request speed in JSON schema with real-world anchors (1=snail, 10=cheetah)
- `validateEntityProfile` clamps (0→1, 11→10), rounds (5.7→6), and defaults non-number speed (string/null/missing → 5)
- All 6 mock entities carry identity-appropriate speeds: Wolf=7, Eagle=8, Oak=1, Fire=6, Cloud=3, Rock=1
- 47 tests passing across all 4 test files (was 27 before this plan)

## Task Commits

Each task was committed atomically:

1. **TDD RED: speed tests** - `5be05cc` (test)
2. **TDD GREEN: speed field implementation** - `48c2ad4` (feat)

_Note: Task 2 (extend tests) was fulfilled during TDD RED phase — all specified tests written as failing tests before implementation._

## Files Created/Modified
- `shared/src/types.ts` — Added `speed: number` field to `EntityProfile` interface
- `server/src/recognition/buildPrompt.ts` — Added speed to JSON schema in SYSTEM_PROMPT
- `server/src/recognition/validateProfile.ts` — Speed clamping/rounding/defaulting logic; mysteryBlob returns speed 5
- `server/src/mock-entities.ts` — Speed values added to all 6 mock entities
- `server/tests/validateProfile.test.ts` — 8 new speed validation tests in `describe('speed validation')` block + mysteryBlob speed assertions
- `server/tests/mock.test.ts` — New test asserting all 6 entities have integer speed in [1, 10]

## Decisions Made
- Speed defaults to 5 (neutral) for missing/non-number values rather than rejecting the entity — ensures the pipeline never fails due to a missing speed field from Claude
- Speed is clamped and rounded server-side so the simulation engine always receives a clean integer 1-10, avoiding float handling in the rendering loop

## Deviations from Plan

None - plan executed exactly as written. TDD RED and GREEN phases completed for both tasks in a single pass. Task 2 tests were written as part of Task 1's TDD RED phase since they target the same behavior.

## Issues Encountered

Pre-existing `behaviors.test.ts` failure was present before this plan (from Plan 05-02 TDD RED phase — behavior modules not yet implemented). This is out of scope. After my changes, all 47 tests pass including behaviors.test.ts (the behaviors stub files were already on disk from a previous session).

## Next Phase Readiness
- `EntityProfile.speed` is ready for Plan 05-02 (simulation engine) to consume
- Simulation engine can map speed 1-10 directly to pixels/second via a multiplier constant
- No blockers — all downstream consumers (mock data, validation, Claude prompt) are aligned

---
*Phase: 05-entity-simulation*
*Completed: 2026-04-07*
