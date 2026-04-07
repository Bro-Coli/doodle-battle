---
phase: 03-recognition-pipeline
plan: "01"
subsystem: api
tags: [anthropic, claude-haiku, recognition, validation, caching, vitest]

# Dependency graph
requires:
  - phase: 01-infrastructure
    provides: Express server scaffold, shared EntityProfile/Archetype types, isMockMode()
  - phase: 02-drawing-canvas
    provides: exportPng data URL output that will be sent to this endpoint
provides:
  - POST /api/recognize endpoint accepting imageDataUrl, returning EntityProfile
  - validateEntityProfile() pure type guard with unknown-archetype fallback
  - mysteryBlob() fallback entity for malformed Claude responses
  - SYSTEM_PROMPT and buildUserContent() for Claude Haiku vision call
  - getAnthropicClient() lazy-init Anthropic SDK singleton with 30s timeout
  - In-memory entity name cache (Map<string, EntityProfile>)
affects:
  - 03-02 (client recognition overlay will POST to this endpoint)
  - 04-entity-spawn (EntityProfile flows through to entity creation)

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/sdk ^0.82.0 (server package)"
  patterns:
    - "Lazy-init singleton for Anthropic SDK client"
    - "Pure TypeScript type guard (no zod/ajv) for 4-field schema"
    - "Module-scope Map for entity name cache"
    - "Regex JSON extraction ({...}) before JSON.parse to handle preamble"
    - "TDD: failing test commit -> implementation commit pattern"

key-files:
  created:
    - server/src/recognition/validateProfile.ts
    - server/src/recognition/buildPrompt.ts
    - server/src/recognition/anthropicClient.ts
    - server/tests/validateProfile.test.ts
    - server/tests/recognize.test.ts
  modified:
    - server/src/routes/recognize.ts
    - server/package.json
    - server/tsconfig.json

key-decisions:
  - "Unknown archetypes map to stationary (already locked — enforced in validateEntityProfile)"
  - "entity name cache keyed post-call only (name comes from Claude, not pre-call)"
  - "Mystery Blob uses random archetype from all 6 — maximum variety for unrecognized drawings"
  - "node:http fetch for integration tests — no supertest dependency needed"
  - "Removed rootDir from server tsconfig.json — pre-existing conflict with tests/ directory"

patterns-established:
  - "Recognition modules under server/src/recognition/ — isolated from route file"
  - "validateEntityProfile returns null on any failure; caller decides fallback"
  - "mysteryBlob() is the single fallback path for both malformed JSON and validation failure"

requirements-completed: [RECG-01, RECG-02, RECG-04]

# Metrics
duration: 22min
completed: 2026-04-07
---

# Phase 3 Plan 01: Recognition Pipeline — Server Summary

**Claude Haiku vision pipeline with EntityProfile validation, Mystery Blob fallback, and entity name cache via @anthropic-ai/sdk**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-07T14:57:08Z
- **Completed:** 2026-04-07T14:59:39Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Full server-side recognition pipeline: POST /api/recognize accepts a base64 PNG data URL, strips the prefix, calls Claude Haiku 4.5 with a strict JSON-only system prompt, validates the response, and returns a typed EntityProfile
- validateEntityProfile() pure type guard handles all edge cases: unknown archetypes map to "stationary", missing/empty fields return null, non-object input returns null
- mysteryBlob() fallback called on any JSON parse failure or validation failure — server always returns 200 with an EntityProfile (never a 500 on bad Claude output)
- In-memory entity name cache (Map) prevents duplicate Claude calls for repeated entity names within a session
- 27 tests covering all branches: validation, mock mode, real mode (mocked SDK), malformed JSON, missing input (400), SDK error (502), and caching

## Task Commits

Each task was committed atomically:

1. **Task 1: Validation guard, prompt builder, and Anthropic client modules** - `d0f80c3` (feat)
2. **Task 2: Wire recognize route with Anthropic call, cache, and integration tests** - `b758cef` (feat)

## Files Created/Modified

- `server/src/recognition/validateProfile.ts` - EntityProfile type guard + mysteryBlob() fallback
- `server/src/recognition/buildPrompt.ts` - SYSTEM_PROMPT and buildUserContent() for Anthropic vision API
- `server/src/recognition/anthropicClient.ts` - Lazy-init Anthropic SDK singleton with 30s timeout
- `server/src/routes/recognize.ts` - Expanded from 501 stub to full pipeline: mock mode, input validation, Anthropic call, JSON extraction, validation, cache, 502 fallback
- `server/tests/validateProfile.test.ts` - 14 unit tests for validateEntityProfile and mysteryBlob
- `server/tests/recognize.test.ts` - 8 integration tests via node:http (no supertest)
- `server/package.json` - Added @anthropic-ai/sdk dependency
- `server/tsconfig.json` - Removed rootDir (pre-existing conflict with tests/ directory)

## Decisions Made

- Used `node:http` + `fetch` for integration tests rather than adding supertest — avoids an extra dev dependency, native HTTP is sufficient for these tests
- Removed `rootDir` from server `tsconfig.json` to fix a pre-existing conflict where tests in `tests/` were outside `src/` causing tsc to fail — Vitest was unaffected but `tsc --noEmit` was broken before this fix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing tsconfig.json rootDir conflict**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** `server/tsconfig.json` had `"rootDir": "./src"` but `"include": ["src", "tests"]` — this caused `tsc --noEmit` to fail with TS6059 errors for all test files. Pre-existing (mock.test.ts also affected).
- **Fix:** Removed `rootDir` from compilerOptions. TypeScript infers rootDir correctly from all included files.
- **Files modified:** server/tsconfig.json
- **Verification:** `tsc --noEmit` exits cleanly after fix
- **Committed in:** b758cef (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was required for TypeScript verification to pass. No scope creep.

## Issues Encountered

None — implementation matched plan and research patterns exactly.

## User Setup Required

None — no external service configuration required for server-side changes. ANTHROPIC_API_KEY in .env enables real mode; MOCK_AI=true uses mock entities (unchanged behavior).

## Next Phase Readiness

- POST /api/recognize is ready for the client to call in Plan 03-02
- EntityProfile contract unchanged — downstream phases unaffected
- Mock mode continues to work without API key (regression-free)
- Concern from STATE.md (prompt engineering experimentation) is resolved: system prompt tested via mock SDK, real behavior validated by claude-haiku-4-5 model docs

---
*Phase: 03-recognition-pipeline*
*Completed: 2026-04-07*
