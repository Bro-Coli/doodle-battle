# Phase 6: Shared Types & Interaction Server Route - Research

**Researched:** 2026-04-07
**Domain:** TypeScript type extension, Express route, Claude Haiku batch prompt
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **5 interaction types**: `chase`, `flee`, `fight`, `befriend`, `ignore`
- **Asymmetric relationships**: Wolf→Rabbit = chase, Rabbit→Wolf = flee. One-sided fight is valid (aggressor = fight, victim = ignore).
- **No intensity/strength values** — type only; strength derived from entity speed in simulation.
- **Nearest target wins** — proximity determines active action when multiple relationships exist.
- **Prompt sends name + role per entity** — minimal but sufficient for Haiku's world knowledge.
- **Duplicate names get identical relationships** — system classifies unique names only, applies to all instances.
- **Integer IDs used in the prompt** to distinguish entities; Haiku reliably returns them without rewriting.
- **Hardcoded mock relationships** for the 6 existing mock entities (Wolf, Eagle, Oak, Fire, Cloud, Rock).
- **Unknown entity names default to `ignore`** for all relationships.
- **Mock mode**: same `isMockMode()` / `MOCK_AI=true` check as existing recognize route.
- **Invalid/malformed Haiku response**: retry once, then default all relationships to `ignore`.
- **1 entity only**: skip AI call, start round anyway (no pairs to classify).
- **Soft cap ~10 entities** — warn but allow exceeding.
- **Same retry + fallback pattern** as existing recognition pipeline.

### Claude's Discretion

- Exact batch prompt wording and system message
- Response JSON format (grouped by entity vs flat pair list)
- Interaction prompt `max_tokens` value (research suggests 1024-2048)
- Validation function structure for interaction response
- How to handle entity IDs in the prompt (sequential integers vs UUIDs)
- Mock relationship graph for the 6 entities (what chases what)

### Deferred Ideas (OUT OF SCOPE)

- Team-based interactions (v2 multiplayer)
- AI-ranked target priority (replaced by nearest-target-wins)
- Intensity/strength values per relationship
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BATC-01 | Pressing "Start Round" sends all entity profiles to a single Haiku call that returns interaction relationships | Batch prompt design, `messages.create` singleton call pattern |
| BATC-02 | Interaction response classifies each entity pair as chase/flee, fight, symbiosis, or ignore | `InteractionMatrix` type design, validation function, JSON response format |
| BATC-03 | Mock mode returns canned interaction relationships for development without API calls | `isMockMode()` branch, hardcoded mock matrix for 6 entities |
</phase_requirements>

---

## Summary

This phase is a pure backend + shared-types deliverable. No client code changes. The goal is to establish a stable API contract — new TypeScript types in `shared/src/types.ts` and a `POST /api/interactions` route — before Phase 7 and Phase 9 consume it.

The codebase already has every structural pattern needed: `recognize.ts` is a nearly 1:1 template for the interaction route. The buildPrompt/validateProfile module pair is the template for the interaction prompt builder and validator. The Anthropic client singleton, `isMockMode()`, and the test harness (node:http + vitest, no supertest) are all reusable without modification.

The only genuinely new concerns are (1) designing an asymmetric per-entity relationship matrix type, (2) producing a prompt format that reliably extracts it from Haiku, and (3) defining the hardcoded mock matrix for the 6 canonical entities.

**Primary recommendation:** Mirror `recognize.ts` structure exactly. Add three new types to `shared/src/types.ts`. Add `server/src/interaction/` folder with `buildInteractionPrompt.ts`, `validateInteraction.ts`, and `server/src/routes/interactions.ts`. Register route in `index.ts`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.82.0` | Anthropic API calls | Already installed, singleton in `anthropicClient.ts` |
| `express` | `^5.2.0` | HTTP routing | Already in use |
| `@crayon-world/shared` | `workspace:*` | TypeScript types | Monorepo shared package pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `^3.0.0` | Test runner | All server-side tests |
| `node:http` | built-in | Test HTTP server | Existing test pattern — no supertest |

No new dependencies required. This phase adds no new packages.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended File Layout

```
server/src/
├── interaction/
│   ├── buildInteractionPrompt.ts   # system prompt + user content builder
│   └── validateInteraction.ts      # response validator + ignore-fallback
├── routes/
│   ├── recognize.ts                # existing — unchanged
│   └── interactions.ts             # new — mirrors recognize.ts structure
└── index.ts                        # register new route

shared/src/
└── types.ts                        # add InteractionType, EntityRelationship, InteractionMatrix
```

### Pattern 1: Asymmetric Per-Entity Relationship Matrix Type

**What:** Each entity has a record mapping every OTHER entity's name to an `InteractionType`. This mirrors the asymmetry requirement — Wolf's view of Rabbit is separate from Rabbit's view of Wolf.

**When to use:** The natural fit for "entity A has relationship X toward entity B."

```typescript
// shared/src/types.ts

export type InteractionType = 'chase' | 'flee' | 'fight' | 'befriend' | 'ignore';

export interface EntityRelationship {
  /** The entity's ID as sent in the prompt (sequential integer, stringified) */
  entityId: string;
  /** Maps each OTHER entity's ID to this entity's interaction type toward it */
  relationships: Record<string, InteractionType>;
}

export interface InteractionMatrix {
  /** One entry per unique entity name in the batch */
  entries: EntityRelationship[];
}
```

**Design rationale:** Using the same integer IDs in the type as in the prompt avoids name-rewriting issues (documented in STATE.md — "Haiku rewrites names"). The client/Phase 9 maps IDs back to entity instances.

### Pattern 2: Batch Prompt (Integer-ID Approach)

**What:** Entities are identified by integer index in the prompt. Claude never sees entity names as keys, only as values.

**When to use:** When sending 2-10 entities for relationship classification.

```typescript
// server/src/interaction/buildInteractionPrompt.ts

export const INTERACTION_SYSTEM_PROMPT = `You are an interaction classifier for a creature simulation game.
Given a list of entities with their real-world roles, classify how each entity relates to every other entity.
Respond with ONLY a JSON array. Each element is an object with:
  "id": number (the entity's id from input),
  "relationships": object mapping each OTHER entity's id (as string key) to one of: "chase", "flee", "fight", "befriend", "ignore"
Base relationships on real-world behavior and ecology. Do not explain or add text outside the JSON array.`;

export function buildInteractionUserContent(
  entities: Array<{ id: number; name: string; role: string }>
): string {
  const entityList = entities
    .map((e) => `- id: ${e.id}, name: "${e.name}", role: "${e.role}"`)
    .join('\n');
  return `Classify interactions for these entities:\n${entityList}`;
}
```

**Token budget:** 5 entities generates ~25 pairs. Flat pair list at ~10 tokens/pair = ~250 tokens output. `max_tokens: 1024` is safe for up to ~10 entities. Use 2048 as ceiling to avoid truncation.

### Pattern 3: Route Structure (mirrors recognize.ts exactly)

```typescript
// server/src/routes/interactions.ts
import { Router } from 'express';
import type { EntityProfile } from '@crayon-world/shared';
import { isMockMode } from './recognize.js';   // reuse exported named function
import { getAnthropicClient } from '../recognition/anthropicClient.js';
import { buildInteractionUserContent, INTERACTION_SYSTEM_PROMPT } from '../interaction/buildInteractionPrompt.js';
import { validateInteractionResponse, ignoreFallback } from '../interaction/validateInteraction.js';
import { MOCK_INTERACTION_MATRIX } from '../mock-interactions.js';

const router = Router();

router.post('/', async (req, res) => {
  const { entities } = req.body as { entities?: unknown };

  // Input validation
  if (!Array.isArray(entities) || entities.length === 0) {
    res.status(400).json({ error: 'entities array required' });
    return;
  }

  // 1-entity edge case: no pairs to classify
  if (entities.length === 1) {
    res.json({ entries: [] });
    return;
  }

  // Mock mode
  if (isMockMode()) {
    res.json(MOCK_INTERACTION_MATRIX);
    return;
  }

  // Deduplicate by name — classify unique names only
  const uniqueNames = [...new Set((entities as EntityProfile[]).map((e) => e.name))];
  const promptEntities = uniqueNames.map((name, idx) => {
    const profile = (entities as EntityProfile[]).find((e) => e.name === name)!;
    return { id: idx, name, role: profile.role };
  });

  // Warn if over soft cap
  if (promptEntities.length > 10) {
    console.warn(`[interactions] ${promptEntities.length} unique entities — prompt may be large`);
  }

  try {
    const client = getAnthropicClient();
    let rawText = '';

    for (let attempt = 0; attempt < 2; attempt++) {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: INTERACTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildInteractionUserContent(promptEntities) }],
      });
      rawText = message.content[0]?.type === 'text'
        ? (message.content[0] as { type: 'text'; text: string }).text
        : '';

      const validated = validateInteractionResponse(rawText, promptEntities.length);
      if (validated) {
        res.json(validated);
        return;
      }
      // Retry once on malformed response
    }

    // Both attempts failed — fall back to all-ignore
    res.json(ignoreFallback(promptEntities));
  } catch (err) {
    console.error('Interaction error:', err);
    res.status(502).json({ error: 'Interaction analysis failed' });
  }
});

export default router;
```

### Pattern 4: Validation Function

```typescript
// server/src/interaction/validateInteraction.ts
import type { InteractionMatrix, InteractionType } from '@crayon-world/shared';

const VALID_TYPES: InteractionType[] = ['chase', 'flee', 'fight', 'befriend', 'ignore'];

export function validateInteractionResponse(
  rawText: string,
  expectedCount: number
): InteractionMatrix | null {
  try {
    const match = rawText.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : rawText);
    if (!Array.isArray(parsed) || parsed.length !== expectedCount) return null;

    for (const entry of parsed) {
      if (typeof entry.id !== 'number') return null;
      if (typeof entry.relationships !== 'object' || entry.relationships === null) return null;
      for (const val of Object.values(entry.relationships)) {
        if (!VALID_TYPES.includes(val as InteractionType)) return null;
      }
    }

    return {
      entries: parsed.map((entry) => ({
        entityId: String(entry.id),
        relationships: entry.relationships as Record<string, InteractionType>,
      })),
    };
  } catch {
    return null;
  }
}

export function ignoreFallback(
  entities: Array<{ id: number }>
): InteractionMatrix {
  return {
    entries: entities.map((e) => ({
      entityId: String(e.id),
      relationships: Object.fromEntries(
        entities.filter((o) => o.id !== e.id).map((o) => [String(o.id), 'ignore' as InteractionType])
      ),
    })),
  };
}
```

### Pattern 5: Mock Interaction Matrix

The 6 mock entities and their ecologically plausible relationships:

| Entity | Toward Wolf | Toward Eagle | Toward Oak | Toward Fire | Toward Cloud | Toward Rock |
|--------|-------------|--------------|------------|-------------|--------------|-------------|
| Wolf | — | ignore | ignore | flee | ignore | ignore |
| Eagle | ignore | — | ignore | flee | ignore | ignore |
| Oak | ignore | ignore | — | flee | befriend | ignore |
| Fire | chase | chase | chase | — | ignore | ignore |
| Cloud | ignore | ignore | befriend | chase | — | ignore |
| Rock | ignore | ignore | ignore | ignore | ignore | — |

**Note:** Fire chases Wolf and Eagle (fire spreads through territory, animal flees = animal's `flee`). Cloud chases fire (rain extinguishes). Oak befriends Cloud (rain nourishes). The mock matrix must be stored as an `InteractionMatrix` object using integer IDs 0-5 in the same order as `MOCK_ENTITIES`.

### Anti-Patterns to Avoid

- **Importing `isMockMode` as a const**: Existing code exports it as a named function (`export function isMockMode()`). Module cache issues occur with const exports during `vi.resetModules()` — do not change this.
- **Using entity names as JSON keys in the prompt**: Haiku rewrites names (e.g. "Wolf" → "wolf", "a wolf"). Use integer IDs as keys in both prompt and response.
- **Symmetric matrix shortcut**: Do not assume A→B = B→A. Each direction is classified independently.
- **Calling `messages.create` twice on first attempt success**: The retry loop must only fire on validation failure, not always.
- **Including `isMockMode` in interactions.ts directly**: Import it from `recognize.ts` to keep it as a single source of truth. (Alternatively, extract to a shared util — either is valid, but don't duplicate the logic.)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP test client | Custom fetch wrapper | Existing `startServer`/`stopServer`/`post` pattern in `recognize.test.ts` | Already tested, handles ephemeral ports correctly |
| Mock mode detection | New env-check function | `isMockMode()` from `recognize.ts` | Single source of truth; already covered by mock.test.ts |
| Anthropic client init | New Anthropic instance | `getAnthropicClient()` from `anthropicClient.ts` | Singleton with 30s timeout — don't create a second client |
| Retry logic library | — | Manual `for (let attempt = 0; attempt < 2; attempt++)` | Two attempts is all that's needed; no library warranted |

---

## Common Pitfalls

### Pitfall 1: Haiku Rewrites Names as Keys
**What goes wrong:** If entity names are used as JSON object keys (e.g. `"Wolf": { "Eagle": "chase" }`), Haiku inconsistently rewrites casing or adds articles. Validation fails silently and falls back to all-ignore on every call.
**Why it happens:** LLMs normalize text even when instructed not to.
**How to avoid:** Use integer IDs as both prompt input keys and response keys. The CONTEXT.md and STATE.md both confirm this is the locked decision.
**Warning signs:** Validation always returns null; all relationships are `ignore`.

### Pitfall 2: Prompt Truncation Above ~10 Entities
**What goes wrong:** The response JSON is cut off mid-array, causing parse failure and fallback to ignore.
**Why it happens:** `max_tokens: 1024` is tight for large entity counts. 10 entities = 90 pairs at ~10 tokens each = ~900 output tokens.
**How to avoid:** Log a warning at 10+ unique entities; use `max_tokens: 1024` as default, document that it handles ~8 entities safely.
**Warning signs:** `validateInteractionResponse` returns null only on large entity counts.

### Pitfall 3: Duplicate Entity Instance Handling
**What goes wrong:** Sending "Wolf" twice in the prompt causes Haiku to return two entries for Wolf with potentially different relationships.
**Why it happens:** Batch prompt doesn't deduplicate.
**How to avoid:** Deduplicate by name before building the prompt. Apply the single classified result to all instances of that name when constructing the final matrix for the client.
**Warning signs:** Inconsistent behavior between two wolves of the same name.

### Pitfall 4: 1-Entity Edge Case Crashes
**What goes wrong:** Single-entity batch has no pairs. If the route calls Haiku anyway, the response is an empty array or malformed. If the code then tries to iterate pairs, it may crash or return unexpected data.
**How to avoid:** Guard at route entry — if `entities.length === 1`, return `{ entries: [] }` immediately, no AI call.

### Pitfall 5: `vi.resetModules()` Breaks `isMockMode` Import
**What goes wrong:** After `vi.resetModules()`, the test re-imports `interactions.ts` which imports `isMockMode` from `recognize.ts`. The module reference is a fresh instance, so `process.env` reads correctly — but only if `isMockMode` is a named function export, not a module-level const.
**How to avoid:** Never change `isMockMode` to a const. Keep the `export function` signature as-is. (Already established pattern in the codebase.)

---

## Code Examples

### Registering the New Route in index.ts

```typescript
// server/src/index.ts — add alongside recognize
import interactionsRouter from './routes/interactions.js';
// ...
app.use('/api/interactions', interactionsRouter);
```

### Test File Pattern (mirrors recognize.test.ts)

```typescript
// server/tests/interactions.test.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// Mock Anthropic SDK — same pattern as recognize.test.ts
vi.mock('@anthropic-ai/sdk', () => { /* ... */ });

async function buildApp(mockAi = 'false', apiKey = 'sk-ant-test') {
  process.env.MOCK_AI = mockAi;
  process.env.ANTHROPIC_API_KEY = apiKey;
  vi.resetModules();
  const { default: interactionsRouter } = await import('../src/routes/interactions');
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/interactions', interactionsRouter);
  return testApp;
}
// ... startServer, stopServer, post helpers identical to recognize.test.ts
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Per-entity API calls (one call per entity pair) | Single batch call for all pairs | Stays within $100 API budget for hackathon |
| Anthropic Batches API (async/24h) | `messages.create` (synchronous) | Required for real-time UX — Batches API incompatible |

---

## Open Questions

1. **Mock relationship graph completeness**
   - What we know: Wolf/Eagle chase prey, Fire consumes, Cloud/Rock are passive.
   - What's unclear: Should Eagle chase Wolf? (eagles don't hunt wolves). Eagle → Rock = ignore seems correct.
   - Recommendation: Use the table in Pattern 5 above. It's ecologically defensible and covers the asymmetric fight case (Fire→Oak = fight, Oak→Fire = ignore).

2. **`isMockMode` import location**
   - What we know: Currently exported from `recognize.ts`. Importing it there creates a mild coupling.
   - What's unclear: Whether to move it to a `server/src/utils/mockMode.ts` shared util.
   - Recommendation: Import from `recognize.ts` for this phase (no new files). Refactor to shared util is a valid future cleanup but out of scope here.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.0 |
| Config file | `server/vitest.config.ts` |
| Quick run command | `pnpm --filter @crayon-world/server test` |
| Full suite command | `pnpm --filter @crayon-world/server test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BATC-01 | POST /api/interactions accepts entity profiles array and calls Haiku once | unit (mocked SDK) | `pnpm --filter @crayon-world/server test -- interactions` | Wave 0 |
| BATC-02 | Response classifies pairs as chase/flee/fight/befriend/ignore; asymmetric | unit | `pnpm --filter @crayon-world/server test -- interactions` | Wave 0 |
| BATC-03 | Mock mode returns canned matrix without API call | unit | `pnpm --filter @crayon-world/server test -- interactions` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @crayon-world/server test`
- **Per wave merge:** `pnpm --filter @crayon-world/server test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/tests/interactions.test.ts` — covers BATC-01, BATC-02, BATC-03
- [ ] `server/src/interaction/buildInteractionPrompt.ts` — no test needed (pure function, exercised via route test)
- [ ] `server/src/interaction/validateInteraction.ts` — inline unit tests within interactions.test.ts are sufficient

*(No new framework install needed — Vitest already configured.)*

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `server/src/routes/recognize.ts`, `server/src/recognition/buildPrompt.ts`, `server/src/recognition/validateProfile.ts`, `server/src/recognition/anthropicClient.ts`, `server/src/mock-entities.ts`, `server/src/index.ts`
- Direct file reads: `server/tests/recognize.test.ts`, `server/tests/mock.test.ts`
- Direct file reads: `shared/src/types.ts`, `server/package.json`, `server/vitest.config.ts`
- `.planning/phases/06-shared-types-interaction-server-route/06-CONTEXT.md` — locked decisions
- `.planning/STATE.md` — key v1.1 decisions (integer IDs, single messages.create)

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — BATC-01, BATC-02, BATC-03 requirement definitions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, no new dependencies
- Architecture: HIGH — every pattern is a direct extension of existing code in the repo
- Pitfalls: HIGH — sourced from actual code inspection and STATE.md recorded decisions
- Mock relationship graph: MEDIUM — ecologically plausible but not formally verified

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain — Express + Anthropic SDK versions locked)
