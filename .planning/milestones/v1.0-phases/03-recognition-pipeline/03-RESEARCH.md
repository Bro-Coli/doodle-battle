# Phase 3: Recognition Pipeline - Research

**Researched:** 2026-04-07
**Domain:** Anthropic SDK (Node.js/TypeScript) — vision API, JSON prompt engineering, client-side UI overlays
**Confidence:** HIGH

## Summary

Phase 3 connects the canvas export from Phase 2 to Claude Haiku's vision API via the Express proxy, then surfaces the result to the player as a card reveal with loading and error states. The server side is a thin Anthropic SDK call that strips the data URL prefix, sends the raw base64 PNG, parses the JSON response, and validates the returned object. The client side is three new HTML overlay components — a spinner, a result card, and a toast — that follow the same `position: fixed` pattern already used by the toolbar.

The largest implementation risk is prompt robustness: Claude must return valid JSON reliably even when drawings are ambiguous or the model is uncertain. The established mitigation is a strict system prompt that mandates JSON, a low `max_tokens` ceiling to prevent verbose responses, and a `Mystery Blob` fallback that absorbs any JSON parsing or archetype validation failure on the server before the response ever reaches the client.

**Primary recommendation:** Install `@anthropic-ai/sdk` on the server, implement the Anthropic call inside the existing `recognize.ts` route, strip the `data:image/png;base64,` prefix server-side, validate the response with a pure TypeScript guard, and build the three UI overlays as vanilla HTML elements appended to `document.body` following the toolbar's existing pattern.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Loading & feedback**
- Simple centered spinner on the drawing region while waiting for Claude
- Drawing stays visible during recognition (do NOT clear on submit — changed from Phase 2 behavior)
- All toolbar buttons disabled during recognition (Submit, Clear, Undo, thickness)
- Soft timeout at 10 seconds shows "Taking longer than expected..." message, hard timeout at 30 seconds

**Error & fallback behavior**
- Unrecognized drawings spawn a "Mystery Blob" entity with random archetype — always return something
- API failures: auto-retry once silently, then show error + manual retry button if second attempt fails
- Error messages appear as a toast/banner above the drawing region — non-blocking, dismissable
- Drawing stays on canvas during errors so player can retry or modify
- Subtle "Mock Mode" badge visible in corner when running without API key

**Recognition result display**
- Card popup showing full EntityProfile: name, archetype, traits list, and role
- Card auto-dismisses after ~5 seconds, player can also click to dismiss early
- Canvas clears when the card dismisses (not when it appears) — drawing stays visible during the "reveal" moment
- Toolbar re-enables after card dismisses

**Prompt & response design**
- Open vocabulary — Claude names whatever it sees, no restrictions or guided categories
- Unknown archetypes map to "stationary" as the safe default
- Strict JSON prompt with server-side validation against EntityProfile schema
- Malformed JSON returns a fallback mystery entity (same as unrecognized)
- Cache recognition results by entity name — reuse cached behavior profiles for repeated entities to save API costs

### Claude's Discretion
- Exact Claude Haiku prompt wording and system message
- Spinner animation style
- Card popup visual design and positioning
- Cache implementation details (in-memory map is fine for PoC)
- Toast/banner styling and animation
- Mock mode badge styling and position
- Retry delay timing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RECG-01 | Drawing is exported as PNG and sent to Claude Haiku for entity recognition | `exportPng` already returns a data URL; server strips prefix and sends as base64 image block via `@anthropic-ai/sdk` |
| RECG-02 | AI returns an entity label using open vocabulary (no fixed object list) | Open-vocabulary system prompt; Claude Haiku 4.5 supports vision; no categories injected |
| RECG-03 | Loading indicator displayed during AI processing | HTML overlay spinner with CSS animation; buttons disabled via existing `disabled` attribute pattern |
| RECG-04 | Graceful error handling when drawing is unrecognized (fallback entity or message) | Server-side JSON validation + Mystery Blob fallback; client toast + retry button on network failure |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.82.0` | Anthropic Messages API client | Official SDK; typed `ImageBlockParam`, automatic retries, configurable timeout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | already installed | Server-side unit tests for validation logic | All new pure functions in `recognize.ts` must be tested |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@anthropic-ai/sdk` | Raw `fetch` to `api.anthropic.com/v1/messages` | SDK adds type safety, retry logic, and timeout support out of the box — no reason to hand-roll for a PoC |

**Installation (server package only):**
```bash
pnpm --filter @crayon-world/server add @anthropic-ai/sdk
```

---

## Architecture Patterns

### Recommended Project Structure (additions to existing)
```
server/src/
├── routes/
│   └── recognize.ts          # Expanded: real Anthropic call, validation, cache
├── recognition/
│   ├── anthropicClient.ts    # Singleton Anthropic client (lazy-init)
│   ├── buildPrompt.ts        # Pure function: constructs system + user messages
│   └── validateProfile.ts    # Pure function: EntityProfile guard + fallback
client/src/
├── recognition/
│   ├── RecognitionOverlay.ts # Spinner, card, toast — all three HTML overlays
│   └── recognizeApi.ts       # fetch POST to /api/recognize with retry + timeout logic
└── style.css                 # New sections: .spinner, .result-card, .toast, .mock-badge
```

### Pattern 1: Anthropic SDK — base64 image block

The PNG data URL from `exportPng` has the prefix `data:image/png;base64,`. The raw base64 string must be extracted before sending.

```typescript
// Source: https://platform.claude.com/docs/en/api/messages-examples (Vision section)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 });

const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

const response = await client.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 256,
  system: SYSTEM_PROMPT,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64Data,
          },
        },
        { type: 'text', text: 'What entity does this drawing represent? Respond in JSON only.' },
      ],
    },
  ],
});

const text = response.content[0].type === 'text' ? response.content[0].text : '';
```

### Pattern 2: Strict JSON system prompt (Claude's discretion on exact wording)

The system prompt must do three things: demand JSON only, specify the schema, and discourage refusals. Candidate structure:

```
You are an entity classifier for a drawing game.
The player submits a freehand sketch. Respond with ONLY a JSON object matching this schema:
{
  "name": string,       // The thing you see, in plain English (open vocabulary)
  "archetype": "walking" | "flying" | "rooted" | "spreading" | "drifting" | "stationary",
  "traits": string[],   // 2–4 short descriptive traits
  "role": string        // One sentence describing the entity's role in nature
}
If the drawing is unclear or unrecognizable, make your best guess. Do not refuse, apologize, or explain — JSON only.
```

Key constraints:
- `max_tokens: 256` keeps responses tight; a valid EntityProfile is well under 200 tokens
- No `temperature` override needed — default is appropriate for structured output tasks
- Do not use prefill (pre-filled assistant messages) — unsupported on Claude 4.x family models per official docs

### Pattern 3: Server-side EntityProfile validation

A pure TypeScript type guard is the correct pattern. Returns `EntityProfile | null`:

```typescript
// Source: shared/src/types.ts defines Archetype and EntityProfile
import type { EntityProfile, Archetype } from '@crayon-world/shared';

const VALID_ARCHETYPES: Archetype[] = [
  'walking', 'flying', 'rooted', 'spreading', 'drifting', 'stationary',
];

export function validateEntityProfile(raw: unknown): EntityProfile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj['name'] !== 'string' || !obj['name']) return null;
  if (!Array.isArray(obj['traits']) || obj['traits'].length === 0) return null;
  if (typeof obj['role'] !== 'string' || !obj['role']) return null;
  // Unknown archetype maps to 'stationary' (locked decision)
  const archetype: Archetype = VALID_ARCHETYPES.includes(obj['archetype'] as Archetype)
    ? (obj['archetype'] as Archetype)
    : 'stationary';
  return { name: obj['name'] as string, archetype, traits: obj['traits'] as string[], role: obj['role'] as string };
}
```

### Pattern 4: In-memory entity name cache

Simple `Map<string, EntityProfile>` on the module scope. Cache key is `name.toLowerCase()`:

```typescript
const profileCache = new Map<string, EntityProfile>();

// Before calling Claude:
const cached = profileCache.get(entityName.toLowerCase());
if (cached) return res.json(cached);

// After successful recognition:
profileCache.set(profile.name.toLowerCase(), profile);
```

Note: The cache key is only known after Claude responds (the name comes from Claude). The cache is useful for the second recognition of the same entity in a session — it cannot pre-empt the first call.

### Pattern 5: Client retry logic

The client makes a fetch POST. On network error or 5xx, retry once after a short delay. On second failure, surface the error toast with manual retry button.

```typescript
async function recognizeWithRetry(dataUrl: string): Promise<EntityProfile> {
  try {
    return await postRecognize(dataUrl);
  } catch (firstError) {
    // Silent retry
    await delay(1000); // retry delay — Claude's discretion per CONTEXT.md
    return postRecognize(dataUrl); // throws on second failure — caller catches
  }
}
```

### Pattern 6: Toolbar disable during recognition

All toolbar buttons (Submit, Clear, Undo, thickness) must be disabled. The existing `disabled` property on `HTMLButtonElement` handles this. There is no special API — set `.disabled = true` on each button before the fetch, restore after card dismiss.

### Anti-Patterns to Avoid

- **Sending the full data URL as-is to the Anthropic API:** The `data:image/png;base64,` prefix must be stripped. Sending it with the prefix will cause an API error (wrong base64 data format).
- **Clearing the canvas on submit:** Phase 2's auto-clear on submit is explicitly removed. Canvas clears only after card dismiss.
- **Clearing the canvas on API error:** Drawing must stay visible so the player can retry.
- **Using prefill (pre-filling the assistant turn):** Unsupported on Claude Haiku 4.5 and all Claude 4.x models. Use the system prompt and `max_tokens` to constrain output instead.
- **Parsing Claude's response without a try/catch:** `JSON.parse` throws on malformed output. Always wrap in try/catch and fall through to the Mystery Blob path.
- **Caching by image hash instead of entity name:** Adds complexity for zero benefit in a single-session PoC — cache by entity name as decided.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client for Anthropic API | Custom `fetch` wrapper | `@anthropic-ai/sdk` | SDK handles auth headers, retries, timeout, TypeScript types |
| CSS spinner animation | Canvas or JS animation | Pure CSS `@keyframes` | Browser-native, zero JS overhead, already rendering in PixiJS thread |
| JSON schema validation | Custom recursive validator | Simple type guard function (see Pattern 3) | EntityProfile has only 4 fields; full schema library (zod/ajv) is overkill for PoC |

**Key insight:** The Anthropic SDK is thin but adds genuine value (typed response shapes, built-in retries). The validation guard is simple enough to hand-write; adding zod purely for 4 fields would be gold-plating.

---

## Common Pitfalls

### Pitfall 1: data URL prefix not stripped
**What goes wrong:** `client.messages.create` receives `data:image/png;base64,iVBOR...` as the `data` field — the Anthropic API returns a 400 because the base64 payload is corrupted by the prefix string.
**Why it happens:** `exportPng` returns a data URL (browser canvas API standard). The Anthropic image block `data` field expects raw base64 only.
**How to avoid:** `const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');` on the server before constructing the message.
**Warning signs:** 400 response from Anthropic with a message about invalid base64 or media type mismatch.

### Pitfall 2: Claude 4.x prefill is unsupported
**What goes wrong:** Passing an assistant message as the last element to "force" JSON output causes a 400 error from the API.
**Why it happens:** Prefill was supported on Claude 3 but is explicitly not supported on Claude Opus 4.6 and later models. Claude Haiku 4.5 falls in this family.
**How to avoid:** Control output format via system prompt and `max_tokens` only. Do not include an assistant message in the `messages` array.
**Warning signs:** API 400 error referencing "prefill" or "assistant last message".

### Pitfall 3: Canvas clear timing
**What goes wrong:** Canvas clears immediately on submit (Phase 2 behavior) — player never sees the drawing while the card is shown; the "reveal moment" UX is lost.
**Why it happens:** Phase 2's submit handler called `drawingCanvas.clear()` inline after export. This must be deferred to the card dismiss callback.
**How to avoid:** Remove `drawingCanvas.clear()` from the submit handler. Call it only in the card dismiss handler. Toolbar re-enable also goes in the same dismiss callback.
**Warning signs:** Canvas is blank when the result card appears.

### Pitfall 4: JSON.parse on Claude response without try/catch
**What goes wrong:** If Claude includes any preamble text or trailing whitespace outside the JSON, `JSON.parse` throws and the server returns a 500.
**Why it happens:** Even with strict prompting, edge cases (safety responses, model uncertainty) can produce non-JSON output.
**How to avoid:** Wrap `JSON.parse` in try/catch; on catch, return the Mystery Blob. Also try extracting the first `{...}` block with a regex before parsing.
**Warning signs:** Unhandled promise rejections on the server for certain drawing inputs.

### Pitfall 5: Cache keyed before Claude responds
**What goes wrong:** Attempting to use the entity name as the cache key before the API call — there is no name yet. Some designs try to hash the image instead.
**Why it happens:** Confusion about what information is available pre-call vs post-call.
**How to avoid:** Only cache after successful recognition. Cache key is `profile.name.toLowerCase()` stored after the API returns. The cache helps on the second submit of the same entity name within a session.

### Pitfall 6: Toolbar state left disabled on error
**What goes wrong:** If the error handler does not re-enable toolbar buttons, the player is stuck — cannot retry or modify the drawing.
**Why it happens:** The happy path (card dismiss re-enables toolbar) is implemented, but error paths omit the re-enable step.
**How to avoid:** All terminal states (card dismiss, error with retry button shown, manual dismiss of error toast) must call the same `enableToolbar()` helper.

---

## Code Examples

### Installing the SDK (server package)
```bash
# Source: https://github.com/anthropics/anthropic-sdk-typescript
pnpm --filter @crayon-world/server add @anthropic-ai/sdk
```

### Anthropic client singleton (server)
```typescript
// Source: https://platform.claude.com/docs/en/api/sdks/typescript
import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30_000, // hard timeout matches locked decision
    });
  }
  return _client;
}
```

### Full recognize route implementation sketch (server)
```typescript
// Source: recognize.ts — extending existing scaffold
router.post('/', async (req, res) => {
  if (isMockMode()) {
    const entity = MOCK_ENTITIES[Math.floor(Math.random() * MOCK_ENTITIES.length)];
    res.json(entity);
    return;
  }

  const { imageDataUrl } = req.body as { imageDataUrl?: string };
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    res.status(400).json({ error: 'imageDataUrl required' });
    return;
  }

  // Check cache
  // (cache key is only available after recognition — skip pre-call cache check)

  try {
    const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: 'Identify this sketch.' },
        ],
      }],
    });

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    let parsed: unknown;
    try {
      // Extract JSON block in case of any preamble
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : rawText);
    } catch {
      parsed = null;
    }

    const profile = validateEntityProfile(parsed) ?? MYSTERY_BLOB();
    profileCache.set(profile.name.toLowerCase(), profile);
    res.json(profile);
  } catch (err) {
    res.status(502).json({ error: 'Recognition failed' });
  }
});
```

### Client submit handler changes
```typescript
// Replace existing submitBtn click handler body
submitBtn.addEventListener('click', async () => {
  const dataUrl = exportPng(app, drawingCanvas.strokeContainerRef, drawingCanvas.region);
  if (dataUrl === null) return;
  // DO NOT clear canvas here — clear happens on card dismiss
  overlay.showSpinner();
  disableAllToolbarButtons();
  try {
    const profile = await recognizeWithRetry(dataUrl);
    overlay.showCard(profile, () => {
      drawingCanvas.clear();
      enableAllToolbarButtons();
    });
  } catch {
    overlay.showError('Recognition failed. Try again.', () => {
      enableAllToolbarButtons();
    });
  }
});
```

### CSS spinner (pure CSS, no JS)
```css
/* Appended to style.css */
.spinner-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.5);
  z-index: 20;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `claude-3-haiku-20240307` | `claude-haiku-4-5` | Oct 2025 | Old Haiku is deprecated Apr 19 2026 — must use new model |
| Prefill (assistant last message) for JSON output | System prompt + `max_tokens` constraint | Claude 4.x release | Prefill causes 400 error on all Claude 4.x models |
| `claude-3-5-haiku` naming | `claude-haiku-4-5` naming | Model family renaming | API ID is `claude-haiku-4-5` (alias) or `claude-haiku-4-5-20251001` (pinned) |

**Deprecated/outdated:**
- `claude-3-haiku-20240307`: Deprecated, retires April 19, 2026 — use `claude-haiku-4-5` instead.
- Prefill pattern: Not supported on Claude Haiku 4.5. Use system prompt constraints.

---

## Open Questions

1. **Optimal `max_tokens` ceiling**
   - What we know: 256 tokens comfortably fits an EntityProfile; higher values waste budget
   - What's unclear: Whether 256 is tight enough to prevent verbose non-JSON preamble before the object
   - Recommendation: Start with 256; if Claude includes preamble text, reduce to 128 and rely on the `{...}` extraction regex

2. **Retry delay timing (Claude's discretion)**
   - What we know: One silent retry is mandated; delay is Claude's discretion
   - What's unclear: Whether a delay before retry helps (API 5xx may clear) or is irrelevant (client network issue)
   - Recommendation: 800–1200ms — enough to avoid hitting rate limits on immediate retry, short enough not to feel broken

3. **Mystery Blob archetype randomization**
   - What we know: Mystery Blob gets a random archetype
   - What's unclear: Whether "random from all 6" or "random from a subset of visible archetypes" is better UX
   - Recommendation: Random from all 6 — keeps the mystery maximally surprising; not a blocker

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (already installed in server package) |
| Config file | `server/vitest.config.ts` (exists) |
| Quick run command | `pnpm --filter @crayon-world/server test` |
| Full suite command | `pnpm -r test --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECG-01 | POST /api/recognize accepts `imageDataUrl`, strips prefix, sends image block | unit (mock Anthropic) | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 |
| RECG-01 | Mock mode returns random MOCK_ENTITIES profile | unit | `pnpm --filter @crayon-world/server test` | ✅ (`mock.test.ts` covers mock mode) |
| RECG-02 | Open-vocab name propagates through — no archetype forced except unknown→stationary | unit | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 |
| RECG-03 | Loading state is visible — spinner shown before fetch resolves | manual (DOM, no test harness) | manual-only | N/A |
| RECG-04 | Malformed JSON falls back to Mystery Blob | unit (`validateEntityProfile`) | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 |
| RECG-04 | Unknown archetype maps to stationary | unit (`validateEntityProfile`) | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 |
| RECG-04 | 502 from server triggers retry + error toast path | unit (mock fetch) | `pnpm --filter @crayon-world/server test` (server) / manual (client) | ❌ Wave 0 (server) |

### Sampling Rate
- **Per task commit:** `pnpm --filter @crayon-world/server test`
- **Per wave merge:** `pnpm -r test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `server/tests/recognize.test.ts` — covers RECG-01 (mock mode + real path with mocked SDK), RECG-02, RECG-04 validation
- [ ] `server/src/recognition/validateProfile.test.ts` — unit tests for `validateEntityProfile` covering all branches: valid object, missing fields, unknown archetype, null input, non-object input

---

## Sources

### Primary (HIGH confidence)
- `https://platform.claude.com/docs/en/api/messages` — Image content block format, TypeScript types, base64 structure
- `https://platform.claude.com/docs/en/api/messages-examples` — Full TypeScript vision example with base64 image blocks
- `https://platform.claude.com/docs/en/about-claude/models/overview` — Claude Haiku 4.5 model ID (`claude-haiku-4-5`), deprecation notice for claude-3-haiku, prefill restriction on Claude 4.x

### Secondary (MEDIUM confidence)
- WebSearch `@anthropic-ai/sdk latest version` → version `0.82.0` confirmed via npmjs.com listing
- WebSearch Claude Haiku model names → `claude-haiku-4-5` confirmed by Anthropic blog post and models overview page

### Tertiary (LOW confidence)
- Retry delay timing (800–1200ms) — based on general API retry practice, not official guidance

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official Anthropic docs confirm SDK name, version range, image block format
- Architecture: HIGH — patterns derived directly from existing codebase + official API examples
- Pitfalls: HIGH (prefill, prefix stripping) / MEDIUM (retry timing) — documented from official sources + known SDK behavior
- Model name: HIGH — confirmed on official models overview page as of April 2026

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable API; model names pinned by snapshot date)
