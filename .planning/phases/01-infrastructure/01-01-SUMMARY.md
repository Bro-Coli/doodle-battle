---
phase: 01-infrastructure
plan: 01
subsystem: infra
tags: [pnpm, typescript, express, vitest, monorepo, mock-ai]

# Dependency graph
requires: []
provides:
  - pnpm workspace monorepo with client, server, shared packages
  - EntityProfile and Archetype TypeScript type definitions in @crayon-world/shared
  - POST /api/recognize endpoint returning mock EntityProfile JSON
  - isMockMode() function auto-detecting ANTHROPIC_API_KEY absence
  - 6 hardcoded EntityProfile objects (one per archetype)
affects:
  - 01-infrastructure (plan 02 - client canvas)
  - 02-drawing-canvas
  - 03-recognition-pipeline
  - 04-entity-spawn

# Tech tracking
tech-stack:
  added:
    - pnpm 10.x workspaces
    - TypeScript 5.x with bundler moduleResolution
    - Express 5.2.x with cors and dotenv
    - tsx 4.x for server watch mode
    - vitest 3.x for unit testing
    - pixi.js 8.17.x (installed, not yet initialized)
  patterns:
    - Shared types without build step (main points to .ts source)
    - isMockMode() function for env-var-based feature flagging
    - TDD red-green for mock entity logic
    - dotenv/config import-first server entry pattern

key-files:
  created:
    - pnpm-workspace.yaml
    - package.json
    - tsconfig.base.json
    - .env.example
    - .gitignore
    - shared/src/types.ts
    - server/src/index.ts
    - server/src/mock-entities.ts
    - server/src/routes/recognize.ts
    - server/vitest.config.ts
    - server/tests/mock.test.ts
    - client/package.json
    - client/tsconfig.json
  modified: []

key-decisions:
  - "isMockMode() exported as named function (not module-level const) to allow per-call env var reads in tests"
  - "server/tsconfig.json includes tests/ dir so vitest picks up types correctly"
  - "Vitest 3.x used (not 4.x from research) — latest available, fully compatible"

patterns-established:
  - "Pattern: shared package main/types point to ./src/types.ts (no build step, tsx/vite handle natively)"
  - "Pattern: import isMockMode() from route module for unit testing env logic in isolation"
  - "Pattern: save/restore process.env in beforeEach/afterEach for isolation in env var tests"

requirements-completed:
  - INFR-01
  - INFR-02

# Metrics
duration: 12min
completed: 2026-04-07
---

# Phase 1 Plan 01: Infrastructure Scaffold Summary

**pnpm monorepo with Express mock API server, shared TypeScript types (EntityProfile/Archetype), and auto-detecting MOCK_AI mode — 5 unit tests all green**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-07T02:56:53Z
- **Completed:** 2026-04-07T03:08:00Z
- **Tasks:** 2
- **Files modified:** 13 created

## Accomplishments

- Full pnpm workspace monorepo with three packages (client, server, shared) resolving via `workspace:*` protocol
- `shared/src/types.ts` exports `EntityProfile` and `Archetype` importable in both server and client without a build step
- `POST /api/recognize` returns a random mock `EntityProfile` when `MOCK_AI=true` or when `ANTHROPIC_API_KEY` is absent
- `isMockMode()` exported for testability; all 5 vitest unit tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold monorepo with shared types** - `ea83501` (chore)
2. **Task 2 RED: Failing tests for mock entities** - `e51986f` (test)
3. **Task 2 GREEN: Express server with mock AI endpoint** - `c7a6ae0` (feat)

## Files Created/Modified

- `pnpm-workspace.yaml` - Declares client, server, shared workspace packages
- `package.json` - Root package with dev:client, dev:server, test scripts
- `tsconfig.base.json` - Strict TypeScript with bundler moduleResolution, ES2022 target
- `.env.example` - Template for ANTHROPIC_API_KEY, MOCK_AI, PORT variables
- `.gitignore` - Excludes node_modules, dist, .env, logs, .DS_Store
- `shared/package.json` - @crayon-world/shared with main pointing to raw .ts source
- `shared/src/types.ts` - Archetype union type and EntityProfile interface
- `server/package.json` - @crayon-world/server with Express 5, cors, dotenv, tsx, vitest
- `server/tsconfig.json` - Extends base config, includes src and tests
- `server/src/index.ts` - Express app entry with dotenv, cors, JSON middleware
- `server/src/mock-entities.ts` - 6 EntityProfile objects (Wolf, Eagle, Oak, Fire, Cloud, Rock)
- `server/src/routes/recognize.ts` - POST handler with isMockMode() exported for testing
- `server/vitest.config.ts` - Vitest config with node environment
- `server/tests/mock.test.ts` - 5 tests for mock entities and isMockMode logic
- `client/package.json` - @crayon-world/client with pixi.js 8.x and vite
- `client/tsconfig.json` - Extends base config

## Decisions Made

- `isMockMode()` implemented as a **function** (not a module-level `const`) so that each call reads the current `process.env` state at invocation time — this enables clean test isolation via `beforeEach`/`afterEach` env var stubs without module cache issues
- Vitest 3.x installed (3.2.4 resolved) rather than the 4.x target from research notes — 3.x is the latest stable release and fully compatible with the test patterns used

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pnpm install succeeded on first run, all 5 tests passed on first GREEN run.

## User Setup Required

None - no external service configuration required. MOCK_AI=true in `.env` means server runs without any Anthropic API key.

## Next Phase Readiness

- Monorepo scaffold is complete and all workspace packages resolve
- Server can be started with `pnpm dev:server` (tsx watch src/index.ts in server/)
- `POST http://localhost:3001/api/recognize` returns valid EntityProfile JSON
- ANTHROPIC_API_KEY is absent from client/ directory (confirmed via grep)
- Ready for Phase 1 Plan 02: client canvas with PixiJS

---
*Phase: 01-infrastructure*
*Completed: 2026-04-07*
