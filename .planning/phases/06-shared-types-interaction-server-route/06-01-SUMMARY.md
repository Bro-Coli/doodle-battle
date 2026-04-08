---
phase: 06-shared-types-interaction-server-route
plan: 01
subsystem: api
tags: [typescript, interaction, shared-types, anthropic, mock-data]

# Dependency graph
requires:
  - phase: 05-entity-simulation
    provides: EntityProfile type and Archetype union used by interaction layer

provides:
  - InteractionType, EntityRelationship, InteractionMatrix types in shared/src/types.ts
  - INTERACTION_SYSTEM_PROMPT and buildInteractionUserContent in server/src/interaction/buildInteractionPrompt.ts
  - validateInteractionResponse and ignoreFallback in server/src/interaction/validateInteraction.ts
  - MOCK_INTERACTION_MATRIX with 6-entity ecological relationships in server/src/mock-interactions.ts

affects:
  - 06-02 (interaction HTTP route that imports these modules)
  - client (will consume InteractionMatrix via API response)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Integer IDs (not entity names) as matrix keys — prevents Haiku from rewriting names
    - System prompt as const, user content as pure function (same pattern as recognition/buildPrompt.ts)
    - satisfies InteractionMatrix on mock data — compile-time type safety without losing literal types

key-files:
  created:
    - server/src/interaction/buildInteractionPrompt.ts
    - server/src/interaction/validateInteraction.ts
    - server/src/mock-interactions.ts
  modified:
    - shared/src/types.ts

key-decisions:
  - "Integer IDs (not names) as matrix keys — Haiku rewrites entity names, stable IDs prevent lookup failures"
  - "validateInteractionResponse uses regex /[\\s\\S]*/ to extract JSON array — handles model preamble gracefully"
  - "ignoreFallback produces a safe all-ignore matrix for both AI retry failures — no crashes on bad AI output"
  - "MOCK_INTERACTION_MATRIX relationships are asymmetric and ecologically plausible (Fire chases Wolf, Wolf flees Fire)"

patterns-established:
  - "Interaction prompt pattern: stable integer IDs in prompt, string-keyed relationships in matrix"
  - "Validator pattern: regex extraction → JSON parse → structural validation → type narrowing"

requirements-completed: [BATC-02, BATC-03]

# Metrics
duration: 10min
completed: 2026-04-08
---

# Phase 6 Plan 01: Shared Types & Interaction Server Route — Types & Modules Summary

**Interaction type system with prompt builder, response validator, and ecologically asymmetric mock matrix using stable integer IDs as keys**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-08T03:25:33Z
- **Completed:** 2026-04-08T03:35:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended shared types with InteractionType, EntityRelationship, and InteractionMatrix — importable by both client and server
- Created prompt builder with strict JSON-only system prompt and pure function for user content (integer-ID-keyed entities)
- Created response validator with regex-based JSON extraction, structural type narrowing, and ignoreFallback safety net
- Created mock interaction matrix covering all 6 entities with asymmetric ecological relationships (e.g., Fire chases Wolf, Wolf flees Fire)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add interaction types to shared package and create prompt builder** - `6f010f7` (feat)
2. **Task 2: Create response validator and mock interaction matrix** - `cafa837` (feat)

## Files Created/Modified
- `shared/src/types.ts` - Added InteractionType, EntityRelationship, InteractionMatrix types
- `server/src/interaction/buildInteractionPrompt.ts` - INTERACTION_SYSTEM_PROMPT constant and buildInteractionUserContent function
- `server/src/interaction/validateInteraction.ts` - validateInteractionResponse (parses AI text to typed matrix) and ignoreFallback
- `server/src/mock-interactions.ts` - MOCK_INTERACTION_MATRIX with 6 entities, IDs 0-5, asymmetric ecological relationships

## Decisions Made
- Integer IDs (not names) as matrix keys: Haiku rewrites entity names, making name-based lookups unreliable. Stable integers fix this at the prompt design level.
- validateInteractionResponse uses regex `/\[[\s\S]*\]/` to extract the JSON array before parsing, gracefully handling any preamble the model might produce.
- ignoreFallback produces all-ignore matrix as safe fallback when both AI retry attempts fail — entities simply coexist without interaction rather than crashing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx tsc` not found (TypeScript not globally installed). Used `server/node_modules/.bin/tsc` instead — standard in this monorepo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 modules are ready for consumption by the interaction HTTP route (06-02)
- Route plan can import INTERACTION_SYSTEM_PROMPT, buildInteractionUserContent, validateInteractionResponse, ignoreFallback, and MOCK_INTERACTION_MATRIX directly
- TypeScript compiles clean across the monorepo

---
*Phase: 06-shared-types-interaction-server-route*
*Completed: 2026-04-08*
