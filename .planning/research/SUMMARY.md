# Project Research Summary

**Project:** Crayon World — v1.1 Entity Interactions & Round System
**Domain:** AI-powered browser game — real-time entity simulation with LLM-driven relationship analysis
**Researched:** 2026-04-07
**Confidence:** HIGH

## Executive Summary

Crayon World v1.1 adds a round-based interaction system on top of a complete v1.0 entity simulation stack. The core challenge is integrating a batch Anthropic Haiku call — one per round start, analyzing all entity relationships simultaneously — into a real-time PixiJS game loop without disrupting the pure behavior function architecture that already works. The research is unambiguous: no new runtime dependencies are required, and all four new capabilities (interaction analysis, round state machine, chase/flee steering, entity removal with fade-out) fit cleanly into the existing stack.

The recommended approach centers on three design decisions that must be made before any code is written: (1) a `RoundPhase` string enum to replace ad-hoc boolean flags, (2) a `_removeEntity()` helper method as the single removal path to prevent five-map leaks, and (3) a name/ID scheme for the batch prompt that survives Haiku's natural tendency to reword entity names. These decisions are upstream of everything else — getting them wrong costs half-day refactors; getting them right means the remaining implementation follows a clear build order with no circular dependencies.

The primary risk is combinatorial explosion in the batch interaction prompt: N entities produce N*(N-1) directional pairs, and without a hard entity cap (~8-10 per round) and sparse-array response format (only non-ignore pairs), the prompt degrades at demo time with many entities. Secondary risks are all map-management issues: the PixiJS stage, five WorldStage maps, and the interaction relationship map must stay synchronized or ghost entities, memory leaks, and silent failures accumulate across rounds.

## Key Findings

### Recommended Stack

The existing stack — PixiJS v8, Express v5, @anthropic-ai/sdk ^0.82.0, TypeScript, Vite, Vitest — covers all v1.1 requirements without additions. The single critical non-choice is to use a standard `messages.create` call (not the Anthropic Message Batches API, which is an async 24-hour workload API incompatible with real-time round flow). Entity fade-out is five lines using `container.alpha` per tick — no tween library needed. Chase/flee targeting at under 50 entities needs no spatial indexing — a linear scan is microseconds.

**Core technologies:**
- PixiJS v8.16.0: rendering, game loop ticker (round countdown), container alpha for fade-out — already installed
- Express v5.2.0: gains one new route (`POST /api/interactions`) mirroring the existing `recognize.ts` pattern
- @anthropic-ai/sdk 0.82.0: single `messages.create` call per round with all entity names/roles as text; no image tokens
- TypeScript shared types: three new exports (`InteractionType`, `EntityRelationship`, `InteractionMatrix`) — additive only, zero breaking changes
- Vitest: new test files for `interactionBehavior.ts` and the server interaction route

### Expected Features

**Must have (table stakes — v1.1 launch):**
- Batch AI relationship analysis — single Haiku call with all entity profiles, returns full relationship matrix
- Round start trigger — "Start Round" button distinct from "Submit Drawing"; disables immediately on click
- Chase/flee steering — Craig Reynolds' Seek/Flee applied as post-dispatch velocity blend, not archetype replacement
- Entity removal on defeat — alpha fade over ~1 second via `_pendingRemovals` map, then full five-map cleanup
- Survivor persistence — entity maps survive round transitions; only defeated entities are individually removed
- Round outcome feedback — minimal "Round complete. N entities remain." message before returning to draw mode

**Should have (P2 — post-demo polish):**
- Relationship reveal moment — 2-3 second overlay showing "Wolf hunts Rabbit" before simulation begins
- Symbiosis cohabitation — friendly entities drift toward each other (Seek with large threshold)
- Interaction blend factor — smooth steering transition between wander and chase modes

**Defer (v1.2+ multiplayer milestone):**
- Scenario objectives (Population, Siege, Escort) with scoring
- Team-based drawing phases
- Trait-influenced combat outcomes
- HP/health point system (explicitly an anti-feature for v1.1 — binary proximity resolution only)

### Architecture Approach

The architecture extends `WorldStage` with three new maps (`_relationships`, `_pendingRemovals`, `_roundState`) and adds a `_gameTick` second pass for interaction forces, keeping all six existing behavior functions completely unchanged. The new `interactionBehavior.ts` is a pure function consuming a pre-built neighbors snapshot — not live entity state — which preserves testability and avoids stale target data. A new HTML overlay (`InteractionOverlay`) follows the `RecognitionOverlay` pattern for the round UI. The server gains one route (`POST /api/interactions`) that is independently testable before any client work begins.

**Major components:**
1. `shared/src/types.ts` — additive: `InteractionType`, `EntityRelationship`, `InteractionMatrix`; zero changes to `EntityProfile`
2. `server/routes/interactions.ts` — new route; accepts `EntityProfile[]`, returns `InteractionMatrix`; mock path via `MOCK_AI=true`
3. `client/world/behaviors/interactionBehavior.ts` — pure function: `applyInteractionForces(state, profile, allStates, allProfiles, relationships, world) => {vx, vy}`
4. `WorldStage.ts` — modified: adds `_relationships`, `_roundState`, `_pendingRemovals`, `startRound()`, `removeEntity()`; `_gameTick` gains two passes after existing behavior dispatch
5. `InteractionOverlay.ts` — new HTML overlay; "Start Round" button, analyzing spinner, round timer, outcome card

**Build order (each step has no unresolved imports):**
shared types → server buildPrompt → server validateMatrix → server route → interactionBehavior → WorldStage → InteractionOverlay → main.ts wiring

### Critical Pitfalls

1. **Map mutation during tick iteration** — deleting from `_entityStates` inside `for...of` silently corrupts iteration; collect all removals into a `toRemove` array during the loop, apply after. Write this pattern before any entity removal code exists.

2. **Entity removal leaking all five maps** — calling `removeChild` without cleaning all five maps and without `destroy({ children: true })` leaves ghost state and GPU leaks; write `_removeEntity()` as the only legal removal path before implementing any defeat logic.

3. **Ad-hoc round state as boolean flags** — `isAnalyzing + isSimulating + roundTimer` scattered across components creates race conditions on double-click; define `RoundPhase = 'idle' | 'analyzing' | 'simulating' | 'done'` and gate all transitions on it before writing any round UI.

4. **Batch prompt combinatorial explosion** — N entities produce N*(N-1) pairs; cap the roster at 8-10 entities per call, ask for sparse non-ignore pairs only, treat missing pairs as "ignore"; design into the prompt format from the start.

5. **Entity name mismatch in Haiku response** — Haiku naturally rewrites names ("oak tree" → "Oak Tree"); use stable UUIDs or zero-indexed integers as keys in the prompt, not human-readable names; retrofit is a 2-hour fix but costs a full demo if missed.

6. **Fade-out ghost behavior** — a "dying" entity with only a visual alpha fade continues moving and triggering fight resolution; add `dying: boolean` to entity state and return early from `dispatchBehavior` when true.

7. **Interaction map not persisted across tick** — storing the relationship map as a local variable in the round-start handler makes it unreachable from `_gameTick`; promote it to a `WorldStage` class field before writing the Haiku call.

## Implications for Roadmap

Based on research, the dependency chain is strict: shared types must precede everything; the server route can be built and tested independently before client work; `_removeEntity()` and `RoundPhase` must be defined before any behavior or UI code. This suggests four phases.

### Phase 1: Shared Foundation & Server Route

**Rationale:** All subsequent phases import from `shared/src/types.ts`. The server route has no client dependencies and can be tested in isolation — exactly the pattern used for `recognize.ts`. Unblocks all parallel client work.

**Delivers:** `InteractionType`, `EntityRelationship`, `InteractionMatrix` types; `POST /api/interactions` server route with mock path; prompt construction and response validation.

**Addresses:** Batch AI relationship analysis (table stake), entity name ID scheme (Pitfall 8), combinatorial explosion mitigations (Pitfall 2).

**Avoids:** Building client interaction logic before the API contract is stable.

### Phase 2: Round State Machine & Entity Removal Infrastructure

**Rationale:** `RoundPhase` and `_removeEntity()` are upstream of both the interaction behaviors and the overlay UI. Research is emphatic that these two must exist before any removal or phase-transition code is written. Doing them together prevents either from being deferred.

**Delivers:** `RoundPhase` enum, `_roundState` in `WorldStage`, `_removeEntity()` helper with full five-map cleanup, `_pendingRemovals` fade queue, entity cap enforcement.

**Addresses:** Ad-hoc boolean flags (Pitfall 5), entity removal map leak (Pitfall 4), map mutation during tick (Pitfall 1), survivor accumulation perf ceiling (Pitfall 9).

**Avoids:** Retrofitting the state machine after race conditions appear; retrofitting the removal helper after map leaks accumulate.

### Phase 3: Interaction Behaviors & WorldStage Integration

**Rationale:** Pure `interactionBehavior.ts` depends on Phase 1 types. `WorldStage` integration depends on Phase 2 infrastructure. This phase wires the relationship map into the game tick and adds the post-dispatch velocity blend.

**Delivers:** `interactionBehavior.ts` (chase/flee/symbiosis pure functions), `_relationships` map on `WorldStage`, second `_gameTick` pass for interaction forces, neighbors snapshot pattern, fight resolution at round end.

**Addresses:** Chase/flee steering (table stake), stale targets in behavior functions (Pitfall 3), interaction map not persisted (Pitfall 7), fade-out ghost behavior (Pitfall 6).

**Avoids:** Behavior functions gaining PixiJS dependencies; circular imports between `EntitySimulation` and `WorldStage`.

### Phase 4: Round UI & End-to-End Integration

**Rationale:** `InteractionOverlay` and `main.ts` wiring are the final layer; they depend on `WorldStage.startRound()` from Phase 3. Building UI last means the underlying system is testable before any user interaction exists.

**Delivers:** `InteractionOverlay` (Start Round button, analyzing spinner, countdown, outcome card), toolbar wiring in `main.ts`, full round flow end-to-end: draw → start → analyze → simulate → outcome → draw.

**Addresses:** Visible interaction analysis phase (table stake), round outcome feedback (table stake), Start Round button gating (Pitfall 5 UX), entity cap "world is full" message.

**Avoids:** Building UI before the state machine and removal infrastructure are solid.

### Phase Ordering Rationale

- Types-first enforces the server/client contract before either side is built, preventing the most common integration divergence.
- Infrastructure-before-behaviors prevents the most expensive retrofits — state machine and removal helper are both rated HIGH recovery cost in PITFALLS.md.
- Pure functions (`interactionBehavior`) are built and unit-tested before being wired into `WorldStage`, following the established pattern of `behaviors/*.ts` files.
- UI is always last — it depends on everything and nothing depends on it.

### Research Flags

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (server route):** Mirrors `recognize.ts` exactly; established pattern in the codebase.
- **Phase 2 (state machine + removal):** PITFALLS.md provides complete code samples; implementation is mechanical.
- **Phase 4 (overlay UI):** Mirrors `RecognitionOverlay`; established DOM-over-canvas pattern.

Phases that may benefit from a planning spike:
- **Phase 3 (interaction behaviors):** The post-dispatch velocity blend and neighbors snapshot pattern are specified but the exact blend factor and archetype gating (which archetypes receive interaction forces) need tuning during implementation. Not unknown territory, but expect iteration.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase analysis + npm registry verification; no new dependencies required |
| Features | HIGH | Clear MVP definition with explicit dependency graph; anti-features explicitly called out |
| Architecture | HIGH | Based on direct read of WorldStage.ts, EntitySimulation.ts, all 6 behavior files; build order is dependency-verified |
| Pitfalls | HIGH | 9 specific pitfalls with code samples, recovery costs, and warning signs; all grounded in codebase reality |

**Overall confidence: HIGH**

### Gaps to Address

- **Interaction blend factor tuning:** Research specifies the blend pattern but not the exact weight. Determine empirically during Phase 3 — start at full replacement, soften if movement feels jerky.
- **Fight resolution metric:** Speed comparison is specified ("faster entity wins"). If this produces unintuitive outcomes in testing, the architecture supports swapping the metric without changing the simulation loop.
- **Entity cap value:** Research recommends 8-10 for the batch prompt and 16-20 total for O(N²) performance. Validate against the 60fps budget on real hardware during Phase 2.
- **Symbiosis UX:** Drift strength, proximity threshold, and cosmetic pulse are underspecified. Defer tuning to post-demo polish.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `WorldStage.ts`, `EntitySimulation.ts`, `shared/src/types.ts`, `server/src/routes/recognize.ts`, `client/src/main.ts`, all 6 behavior files
- npm registry (`npm show @anthropic-ai/sdk version`, `npm show pixi-actions version`) — version verification
- PixiJS v8 Garbage Collection guide: https://pixijs.com/8.x/guides/concepts/garbage-collection
- PixiJS GitHub issues #11409, #11373 (May/Apr 2025) — memory leak patterns confirmed
- MDN — `Map.prototype.forEach` iteration behavior during mutation

### Secondary (MEDIUM confidence)
- Anthropic API docs — Message Batches API documented as async/24h
- Scribblenauts, Spore, RTS, Pokemon pattern analysis — feature expectations grounded in genre precedent
- Craig Reynolds' Seek/Flee steering — standard algorithm, well-known implementation

### Tertiary (LOW confidence)
- Anthropic API pricing/rate limits: https://platform.claude.com/docs/en/about-claude/pricing — budget estimates; verify before demo

---
*Research completed: 2026-04-07*
*Ready for roadmap: yes*
