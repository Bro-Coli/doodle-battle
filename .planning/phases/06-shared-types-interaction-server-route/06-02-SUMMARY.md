---
phase: 06-shared-types-interaction-server-route
plan: 02
subsystem: api
tags: [typescript, express, interaction, anthropic, tdd, mock-data]

# Dependency graph
requires:
  - phase: 06-01
    provides: INTERACTION_SYSTEM_PROMPT, buildInteractionUserContent, validateInteractionResponse, ignoreFallback, MOCK_INTERACTION_MATRIX

provides:
  - POST /api/interactions route handler in server/src/routes/interactions.ts
  - Route registered in server/src/index.ts at /api/interactions
  - 10-test suite covering mock mode, real AI mode, input validation, deduplication, retry, fallback, and 502 error

affects:
  - phase-07 (client round trigger will call POST /api/interactions)
  - phase-09 (interaction-driven entity behavior uses matrix returned by this route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD flow with vitest vi.mock SDK, buildApp/startServer/stopServer/post helpers (mirrors recognize.test.ts pattern exactly)
    - Retry loop (max 2 attempts) before ignoreFallback — no crashes on bad AI output
    - Deduplication by entity name before prompt construction — stable integer IDs prevent combinatorial explosion on duplicate names

key-files:
  created:
    - server/src/routes/interactions.ts
    - server/tests/interactions.test.ts
  modified:
    - server/src/index.ts

key-decisions:
  - "Deduplication reduces to 1 unique entity triggers the same empty-entries short-circuit as an original single-entity request — consistent semantics"
  - "Route mirrors recognize.ts structure: mock mode check before AI call, retry loop with validation, catch block returns 502"
  - "Test suite uses dynamic import + vi.resetModules() per buildApp call to isolate env var changes across tests"

patterns-established:
  - "Interaction route pattern: validate → deduplicate → edge-case short-circuit → mock → AI retry loop → fallback"
  - "Test helper pattern: vi.mock at module level, getMockCreate() via dynamic import, buildApp() sets env + vi.resetModules() + dynamic import of route"

requirements-completed: [BATC-01, BATC-02, BATC-03]

# Metrics
duration: 2min
completed: 2026-04-08
---

# Phase 6 Plan 02: Shared Types & Interaction Server Route — HTTP Route Summary

**POST /api/interactions Express route with deduplication, 2-attempt retry, ignore fallback, mock mode, and a 10-test vitest suite**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-08T03:28:55Z
- **Completed:** 2026-04-08T03:30:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created POST /api/interactions route handling input validation, single-entity short-circuit, name deduplication, mock mode, real AI with 2-attempt retry loop, ignoreFallback safety net, and 502 error handling
- Registered route in server/src/index.ts — endpoint live alongside /api/recognize
- Built 10-test suite (TDD red-green) mirroring recognize.test.ts pattern exactly: vi.mock SDK, buildApp with env isolation, startServer/stopServer/post helpers — all 57 server tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create interaction route and register in Express app** - `044bf23` (feat)
2. **Task 2: Verify full test suite and end-to-end mock curl** — verification only, no commit needed

**Plan metadata:** (docs commit, recorded after summary creation)

_Note: Task 1 used TDD — test file created first (RED), then route implementation (GREEN), both in same commit._

## Files Created/Modified
- `server/src/routes/interactions.ts` - POST /api/interactions handler: validation, deduplication, mock mode, 2-attempt AI retry, ignoreFallback, 502 catch
- `server/tests/interactions.test.ts` - 10-test vitest suite covering all behaviors
- `server/src/index.ts` - Added interactionsRouter import and app.use('/api/interactions', ...) registration

## Decisions Made
- Deduplication reducing to 1 unique entity reuses the single-entity short-circuit (returns `{ entries: [] }`) — consistent semantics regardless of how duplicates arrived
- Route structure mirrors recognize.ts: mock-mode check after deduplication, retry loop wraps client.messages.create, catch block logs and returns 502
- Test suite uses the exact same vi.mock + buildApp + startServer helper pattern as recognize.test.ts — consistency across the server test suite

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- None - all 10 tests passed on first run after route creation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- POST /api/interactions is live and independently testable with `curl` in mock mode
- Route returns valid `InteractionMatrix` — downstream phases (7, 9) can integrate immediately
- All 57 server tests pass with no regressions

## Self-Check: PASSED

- server/src/routes/interactions.ts — FOUND
- server/src/index.ts — FOUND (contains interactionsRouter)
- server/tests/interactions.test.ts — FOUND
- 06-02-SUMMARY.md — FOUND
- Commit 044bf23 — FOUND

---
*Phase: 06-shared-types-interaction-server-route*
*Completed: 2026-04-08*
