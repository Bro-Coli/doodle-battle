# Project Research Summary

**Project:** Crayon World
**Domain:** Browser-based AI-powered drawing game with entity simulation
**Researched:** 2026-04-07
**Confidence:** HIGH

## Executive Summary

Crayon World is a creative sandbox browser game where players draw entities that the AI recognizes and brings to life on the canvas with archetype-appropriate behavior. Research across comparable titles (Scribblenauts, Crayon Physics, Quick Draw) confirms the core design: the "aha moment" is when a rough sketch becomes a living thing with recognizable behavior. The recommended approach is a lightweight TypeScript + PixiJS frontend with a minimal Express/Hono API proxy, using Claude Haiku's vision API for sketch recognition. The entity system should use a simple behavior dispatch map (6 archetypes, each a pure function) rather than a full ECS — the AI does the complex classification work once at spawn, and the game engine runs simple deterministic rules per frame.

The primary technical risk is the AI integration: latency (0.5–3 seconds) must never feel like a crash, the API key must never reach the browser, and the entity profile JSON returned by Claude must be validated defensively. A mock mode (environment variable `MOCK_AI=true` returning pre-baked profiles) is mandatory from day one to keep iteration speed high without burning API credits. Architecture decisions made at scaffolding time — plain data interfaces in `shared/types.ts`, simulation as pure functions, renderer as read-only consumer — are the critical investments that make the PoC extensible to multiplayer without a rewrite.

The PoC scope is deliberately narrow: freehand drawing, submit-to-AI, visible recognition feedback, entity spawns and moves. Everything else — entity interactions, emergent ecosystems, crayon aesthetic, multiplayer, scenarios — is explicitly deferred. Research confirms this sequencing is correct: open vocabulary recognition is the differentiator, and validating it is the entire purpose of the PoC.

---

## Key Findings

### Recommended Stack

The stack is intentionally minimal. PixiJS v8 provides GPU-accelerated 2D rendering with built-in canvas export (`renderer.extract.canvas()`) needed for the AI pipeline, and a WebGPU upgrade path for future performance work. Vite + TypeScript is the fastest local development loop for a hackathon pace. `perfect-freehand` is a single, no-dependency library that transforms raw mouse events into pressure-sensitive strokes — this one addition makes the entire drawing experience feel intentional rather than crude.

On the server side, Express or Hono acts as an API proxy: it holds the Anthropic API key, forwards recognition requests to Claude, and caches results by entity label. No database, no auth, no framework — a single `index.ts`. Claude Haiku 4.5 is the right model choice: best sketch-understanding quality at lowest cost (~$0.0001/call against $100 of available credits).

**Core technologies:**
- **PixiJS v8:** Renderer — GPU-accelerated 2D, built-in PNG export, WebGPU-ready
- **TypeScript 5.4+:** Language — shared types between client and server, type-safe entity profiles
- **Vite 6:** Build tooling — fast HMR, zero config for PixiJS, critical for hackathon pace
- **perfect-freehand 1.x:** Drawing quality — transforms raw pointer events to smooth tapered strokes
- **@anthropic-ai/sdk (latest):** AI client — official TypeScript SDK with vision API support
- **Claude Haiku 4.5:** AI model — best sketch recognition at lowest cost per call
- **Express or Hono:** API proxy — mandatory for API key security; single-file minimal server
- **Colyseus 0.15.x (deferred):** Multiplayer — purpose-built game server; architecture now to enable later

**Rejected:** Phaser (opinionated framework overhead), Box2D (physics conflicts with archetype model), React/Next.js (SSR overhead for a game), AI image generation (too slow and expensive for entity sprites).

### Expected Features

The core feature dependency chain is strictly linear: freehand drawing → PNG export → AI recognition → behavior profile → entity spawn → entity motion. Each layer depends on the previous. Multiplayer, interactions, and scenarios live below this chain and are explicitly post-PoC.

**Must have (table stakes):**
- Freehand canvas with real-time stroke rendering — missing this means no product
- Submit button with loading indicator — AI latency must never look like a crash
- Visible recognition feedback (entity label at spawn) — silent spawn feels broken
- Entity spawns with archetype-appropriate motion — a wolf must walk, a bird must fly
- Multiple entities coexisting on canvas — replacing the previous entity kills replay
- Clear canvas button — without undo/clear, players can't recover from bad drawings
- Graceful fallback for unrecognized drawings — silence on failure is worse than a message

**Should have (competitive):**
- Behavior profile tooltip or spawn card — makes the AI's work legible, builds trust
- Entity label floating above sprite — canvas becomes a readable "world dictionary"
- Simple spawn animation (scale-in) — transforms "it appeared" into "it came to life"
- Recognition confidence display — "I think this might be a wolf!" adds delight

**Defer (v2+):**
- Entity interactions (wolf chases sheep) — requires interaction system, post-PoC
- Emergent ecosystem behavior — requires interactions first
- Crayon aesthetic / paper texture — deferred per PROJECT.md
- Scenario / objective layer — meaningful only once core loop is validated
- Multiplayer asymmetric teams — nothing comparable exists in browser games, worth building second

### Architecture Approach

The recommended pattern is lightweight entity records with behavior dispatch — not a full Entity Component System. An `Entity` is a plain TypeScript interface (data only, no methods). A `BehaviorFn` is a pure function `(entity, world, dt) => void`. A dispatch map keyed by the 6 archetypes (`walking`, `flying`, `rooted`, `spreading`, `drifting`, `stationary`) routes each entity to the right behavior each frame. The PixiJS Ticker drives the game loop; the Renderer syncs sprite positions from entity state but never writes back to it. This one-way data flow (AI → EntityManager → Simulation → Renderer) is both testable and multiplayer-ready.

**Major components:**
1. **DrawingCanvas** — captures freehand input via PixiJS Graphics, exports PNG on submit
2. **AIService** — calls the API proxy, caches results by entity label, returns typed `EntityProfile`
3. **APIProxy (server)** — holds API key, makes two sequential Claude calls (recognition + profile generation)
4. **EntityManager** — creates and maintains the entity list from profiles
5. **Simulation** — runs `behavior[archetype](entity, world, dt)` each frame via PixiJS Ticker
6. **Renderer** — syncs PixiJS sprite positions from entity state; read-only consumer of simulation output

### Critical Pitfalls

1. **API key in browser bundle** (P0) — never use `import.meta.env.ANTHROPIC_API_KEY` on the client. All Claude calls route through the server proxy. Set this up on day one.
2. **No dev mock mode** (P0) — without `MOCK_AI=true` returning pre-baked profiles, every iteration of the draw→spawn loop costs a real API call. 50 iterations/day depletes credits in days.
3. **AI latency perceived as a crash** (P1) — show immediate UI feedback the moment the submit button is pressed. Never leave the user with no visual change after an action.
4. **Frame-rate-coupled simulation** (P1) — always multiply movement by `dt` (`ticker.deltaMS / 1000`). First line of entity movement code, not something to add later.
5. **Overscoping entity behavior** (P1) — each archetype is one function, under 50 lines. Set a hard time box. Simple rules produce emergent-looking results.
6. **Scope creep into multiplayer** (P1) — architecture for it now, build it later. Installing Colyseus during PoC week is the most predictable way to miss the demo.
7. **Inconsistent AI profile JSON** (P2) — validate every Claude response with Zod. Map unknown archetypes to a default. Wrap in try/catch with a generic fallback entity.

---

## Implications for Roadmap

Based on research, the build order is dictated by the linear feature dependency chain and two P0 security/dev-velocity requirements that must land in phase 1.

### Phase 1: Scaffolding and API Proxy

**Rationale:** P0 pitfalls (API key exposure, CORS failures, no mock mode) all originate at setup time. Fixing them retroactively is painful. The proxy and mock mode must exist before any AI work begins.
**Delivers:** Working monorepo with client/server/shared structure, PixiJS rendering a blank canvas, API proxy running locally, CORS configured, `MOCK_AI=true` returning a hard-coded wolf profile.
**Addresses:** Table stakes: "no install / no login" (static client), "loading indicator" groundwork.
**Avoids:** Pitfalls #3 (API key), #6 (CORS), #7 (no mock mode).

### Phase 2: Drawing Canvas

**Rationale:** The entire pipeline starts with a drawing. PNG export is the input to the AI call. This phase must exist before the recognition pipeline can be tested end-to-end.
**Delivers:** Freehand drawing with `perfect-freehand` strokes, undo/clear, PNG export function.
**Addresses:** Table stakes: freehand drawing, real-time stroke rendering, clear/undo.
**Avoids:** Pitfalls #1 (canvas export blocking — implement `requestIdleCallback` from the start), #9 (drawing feel — `perfect-freehand` is non-negotiable here).

### Phase 3: Recognition Pipeline

**Rationale:** With the canvas exporting PNGs and the proxy running, this phase wires the two halves together. Mock mode enables fast iteration without real API calls during development.
**Delivers:** Submit button → PNG sent to proxy → Claude Haiku recognition + profile generation → validated `EntityProfile` returned to client. Loading indicator and error handling included.
**Addresses:** Table stakes: visible recognition feedback, loading indicator, error feedback.
**Avoids:** Pitfalls #2 (AI latency UX — loading state from day one), #7 (mock mode already exists), #10 (explicit submit button, not mid-stroke), #13 (Zod validation on profile response).

### Phase 4: Entity Spawn and Rendering

**Rationale:** With profiles arriving from the AI, entities need to appear on canvas as distinct visual objects. This phase connects EntityManager and Renderer and establishes the two-layer canvas (drawing layer + entity layer).
**Delivers:** Entity spawns at drawing centroid, distinct sprite per archetype, entity label floating above sprite, drawing strokes cleared on submit, multiple entities coexisting.
**Addresses:** Table stakes: entity spawns visibly, multiple entities coexist, entity label.
**Avoids:** Pitfalls #5 (texture leaks — reuse sprites per archetype), #11 (spawn overlap — clear drawing layer, spawn at centroid).

### Phase 5: Entity Simulation

**Rationale:** Entities are on canvas but stationary. This phase adds the archetype behavior dispatch and game loop. It is time-boxed: 6 functions, each under 50 lines.
**Delivers:** PixiJS Ticker-driven game loop with delta-time, 6 behavior functions (`walking`, `flying`, `rooted`, `spreading`, `drifting`, `stationary`), entities moving in recognizable identity-appropriate patterns.
**Addresses:** Table stakes: entity moves in recognizable way.
**Avoids:** Pitfalls #4 (dt from first line), #8 (time-boxed, no pathfinding or state machines).

### Phase 6: Polish and Integration

**Rationale:** Core loop is complete. This phase adds delight features that are low complexity / high perceived quality, and validates the loop against bad inputs (intentionally crude drawings).
**Delivers:** Behavior profile tooltip/spawn card, simple scale-in spawn animation, recognition confidence display, graceful "mysterious creature" fallback for unrecognized drawings, integration testing with bad drawings.
**Addresses:** High-value differentiators: profile visible to player, confidence display, spawn animation.
**Avoids:** Pitfall #14 (testing with bad drawings — explicit step in this phase).

### Phase Ordering Rationale

- Phases 1-3 address the two P0 pitfalls before any feature work begins. This is non-negotiable.
- Phases 2 and 3 have a partial parallel opportunity: PNG export (Phase 2) and API proxy setup (Phase 1 overlap into Phase 3) can proceed simultaneously if two developers are working.
- Phases 4 and 5 follow the linear feature dependency: rendering before simulation, because the game loop needs entities to exist before it can update them.
- Phase 6 is polish-only — no new systems, no scope creep. Entity interactions, ecosystem behavior, and multiplayer are explicitly not in Phase 6.
- The architecture decisions in Phase 1 (plain data interfaces, shared types, simulation as pure functions) make Colyseus migration a server-side addition rather than a client rewrite.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Recognition Pipeline):** Claude Haiku prompt engineering for sketch recognition and structured JSON profile generation needs experimentation. The exact prompt structure, JSON schema, and fallback logic benefit from a focused spike.
- **Phase 5 (Entity Simulation):** Behavior function designs for `spreading` and `drifting` archetypes are underspecified. Worth 30 minutes of design before coding to avoid mid-phase pivots.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Scaffolding):** Vite + PixiJS + Express monorepo is well-documented. Standard setup, no surprises.
- **Phase 2 (Drawing Canvas):** `perfect-freehand` has strong documentation and examples. PixiJS Graphics API is stable.
- **Phase 4 (Entity Rendering):** PixiJS sprite management and container layering are standard patterns.
- **Phase 6 (Polish):** All polish items are additive UI work on an existing system.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | PixiJS, Vite, TypeScript, Anthropic SDK all have stable APIs and strong documentation. `perfect-freehand` is well-established. Colyseus recommendation is based on its strong game-server track record. |
| Features | HIGH | Reference games are well-documented. Feature dependencies are logical and validated against Scribblenauts/Crayon Physics patterns. Deferral decisions are explicit and justified. |
| Architecture | HIGH | Behavior dispatch pattern is a proven lightweight alternative to ECS. Data flow and component boundaries are clean and testable. Multiplayer migration path is clear. |
| Pitfalls | HIGH | Pitfalls are specific, actionable, and grounded in known failure modes for AI-integrated browser games. Priority matrix is calibrated by severity and build phase. |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude Haiku sketch recognition quality:** Unknown until tested on actual crude drawings. The PoC must validate that open vocabulary recognition works reliably enough to feel magical rather than frustrating. If quality is insufficient, a constrained vocabulary fallback (30-50 common objects) may be needed.
- **Behavior profile JSON schema:** The exact fields Claude will reliably return (particularly `hostileTo` and `symbiosis` arrays) need validation against real API responses before EntityManager is built against them. Zod schema definition should be driven by observed outputs, not assumed fields.
- **Performance ceiling for entity count:** Research doesn't establish at what entity count PixiJS + Simulation performance degrades noticeably in a browser. Likely not a PoC concern (10-20 entities), but worth noting for Phase 5.

---

## Sources

### Primary (HIGH confidence)
- PixiJS v8 official documentation — renderer, Graphics API, Ticker, extract API
- Anthropic API documentation — vision API, Claude Haiku model specs, pricing
- `perfect-freehand` library documentation and examples
- Vite 6 official documentation — proxy configuration, TypeScript support

### Secondary (MEDIUM confidence)
- Reference game analysis (Scribblenauts, Crayon Physics, Quick Draw, Google AutoDraw, Skribbl.io, Spore) — feature expectations and core loop patterns
- Colyseus 0.15 documentation — multiplayer migration path assessment

### Tertiary (LOW confidence)
- Performance estimates for canvas export blocking (50-200ms) — based on general browser rendering knowledge, not benchmarked for this specific setup
- API call cost estimates ($0.0001/call) — based on published Haiku pricing, actual cost depends on image size and output length

---

*Research completed: 2026-04-07*
*Ready for roadmap: yes*
