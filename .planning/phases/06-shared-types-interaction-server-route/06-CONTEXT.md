# Phase 6: Shared Types & Interaction Server Route - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

New shared TypeScript types for interaction classification and a `POST /api/interactions` server route that accepts entity profiles, calls Claude Haiku once to determine all pairwise relationships, and returns an interaction matrix. Includes mock mode support. No client-side UI, no simulation changes, no entity removal — just the API contract.

</domain>

<decisions>
## Implementation Decisions

### Interaction classification
- 5 interaction types: `chase`, `flee`, `fight`, `befriend`, `ignore`
- Relationships are **asymmetric per-entity** — Wolf→Rabbit = chase, Rabbit→Wolf = flee. One entity might fight while the other ignores (fire destroys tree, tree doesn't fight back)
- Fight can be one-sided — aggressor has `fight`, victim has `ignore` (victim gets destroyed without engaging)
- No intensity/strength values — just the type. Strength is derived from entity speed in the simulation
- Nearest target wins for priority — if an entity has multiple relationships (chase rabbit AND flee bear), proximity determines which action is active at any moment

### Batch prompt design
- Prompt sends **name + role** per entity — minimal but sufficient for Haiku's world knowledge
- **Duplicate names get identical relationships** — two wolves both chase the rabbit. System can optimize by classifying unique names only, then applying results to all instances of that name
- Integer IDs used in the prompt to distinguish entities in the response (research decision)
- AI response format: Claude's discretion — pick the most reliable format for consistent Haiku output

### Mock interaction data
- Hardcoded relationships for the 6 existing mock entities (Wolf, Eagle, Oak, Fire, Cloud, Rock)
- Unknown entity names default to `ignore` for all relationships — safe fallback
- Mock mode triggered by same `MOCK_AI=true` / missing API key check as existing recognize route

### Error & edge cases
- Invalid/malformed Haiku response: retry once, then default all relationships to `ignore`
- 1 entity only: skip AI call, start round anyway (no pairs to classify)
- Soft cap at ~10 entities — warn user but allow exceeding. Keeps prompt tokens manageable
- Same retry + fallback pattern as existing recognition pipeline

### Claude's Discretion
- Exact batch prompt wording and system message
- Response JSON format (grouped by entity vs flat pair list)
- Interaction prompt `max_tokens` value (research suggests 1024-2048)
- Validation function structure for interaction response
- How to handle entity IDs in the prompt (sequential integers vs UUIDs)
- Mock relationship graph for the 6 entities (what chases what)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/recognition/buildPrompt.ts`: Pattern for system prompt + user content construction — interaction prompt follows same structure
- `server/src/recognition/validateProfile.ts`: Pattern for response validation with fallback — interaction validation follows same approach
- `server/src/recognition/anthropicClient.ts`: Shared Anthropic client singleton — reuse for interaction calls
- `server/src/routes/recognize.ts`: Route structure with mock mode branching, cache, and error handling — interaction route mirrors this
- `server/src/mock-entities.ts`: 6 mock entities with profiles — mock interactions reference these names
- `shared/src/types.ts`: EntityProfile type — interaction types extend this file

### Established Patterns
- `isMockMode()` function for mock branching (named export, not const)
- Server-side JSON validation with fallback on malformed response
- JSON-only system prompt to prevent preamble from Claude
- `dotenv/config` import at server entry point
- Vite proxies `/api` to server in dev

### Integration Points
- New route `POST /api/interactions` mounted alongside existing `/api/recognize`
- New types (`InteractionType`, `EntityRelationship`, `InteractionMatrix`) in `shared/src/types.ts`
- Client will call this route in Phase 9 when "Start Round" is pressed
- EntityProfile from recognition is the input to the interaction call

</code_context>

<specifics>
## Specific Ideas

- One-sided fight is key: fire destroys tree but tree doesn't fight back. This means "fight" is really "destroy target" — the aggressor approaches and the victim just gets eliminated on proximity.
- Duplicates sharing relationships is important for the future multiplayer vision — two wolves from the same team would behave identically toward enemies.
- Optimizing by classifying unique names only (not unique instances) keeps the prompt size manageable even with many entities.

</specifics>

<deferred>
## Deferred Ideas

- **Team-based interactions**: Duplicate entities on opposing teams fighting each other — requires multiplayer/team system (v2).
- **AI-ranked target priority**: Having Haiku return a priority order for multiple targets — replaced by nearest-target-wins proximity logic.
- **Intensity/strength values per relationship**: Deferred — strength derived from entity speed in simulation.

</deferred>

---

*Phase: 06-shared-types-interaction-server-route*
*Context gathered: 2026-04-07*
