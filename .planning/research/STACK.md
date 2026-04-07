# Stack Research

**Domain:** Browser game — entity interactions & round system (v1.1 milestone)
**Project:** Crayon World
**Researched:** 2026-04-07
**Confidence:** HIGH

---

## Context: Additive Milestone — No Stack Changes

The existing stack (PixiJS v8, Express v5, @anthropic-ai/sdk, Vitest, pnpm workspaces) is validated and stays. This document records the v1.1 verdict: **no new runtime dependencies required**. All four new capabilities fit within the current stack.

---

## New Capabilities and How They Map to the Existing Stack

### 1. Batch Interaction Analysis (server-side)

**What's needed:** One Haiku call per round start. Receives all current entity names, returns a JSON interaction map showing how each entity relates to every other (`wolf → sheep: chase`, `sheep → wolf: flee`, etc.).

**Verdict:** Existing `@anthropic-ai/sdk ^0.82.0` + a new Express route. No new packages.

**Critical non-choice — do NOT use the Anthropic Message Batches API** (`client.messages.batches.create`). That API submits async workloads processed within 24 hours. It is incompatible with a real-time round system. The correct call is a standard `messages.create` with all entity names as text in the user content, with `max_tokens` capped at ~512. The response arrives in <5s.

**New file:** `server/src/routes/interactions.ts` — mirrors the pattern of the existing `routes/recognize.ts`.

### 2. Round System (client-side)

**What's needed:** A state machine: `idle → submitting → simulating → ended`. "Start Round" button triggers `/api/interactions`, then runs a countdown (~30s), then ends.

**Verdict:** No new library. Implement as a `RoundManager` class in `client/src/world/`. Timer via the existing PixiJS `Ticker` already driving the game loop — decrement a `remainingMs` counter each tick. Using `setInterval`/`setTimeout` is worse because it drifts and requires teardown coordination with the ticker.

### 3. Entity Relationship & Targeting System

**What's needed:** An `InteractionMap` type, plus chase/flee behaviors that steer toward or away from the nearest entity of a given name. The per-tick behavior functions need to see other entity positions.

**Verdict:** Extend the existing pure function contract with an optional `others` parameter. No spatial indexing library (e.g., `rbush`, `kd-tree`) is warranted — at <50 entities a linear scan is microseconds per tick.

```typescript
// Current
dispatchBehavior(state: EntityState, dt: number, world: WorldBounds): EntityState

// v1.1 — others is optional; all six existing behaviors ignore it unchanged
dispatchBehavior(state: EntityState, dt: number, world: WorldBounds, others?: EntitySnapshot[]): EntityState
```

**New shared types** (add to `shared/src/types.ts`):

```typescript
export type InteractionType = 'chase' | 'flee' | 'symbiosis' | 'ignore';

// Indexed by entity name → target name → relationship
export type InteractionMap = Record<string, Record<string, InteractionType>>;

export interface EntitySnapshot {
  id: string;    // matches EntityProfile.name
  x: number;
  y: number;
  alive: boolean;
}
```

**New behavior files** (client only):
- `client/src/world/behaviors/chasingBehavior.ts` — steer toward nearest target
- `client/src/world/behaviors/fleeingBehavior.ts` — steer away from nearest threat

Existing six behavior files are untouched.

### 4. Entity Removal with Fade-Out

**What's needed:** Defeated entities fade to alpha=0 over ~500ms then are removed from the stage and all `WorldStage` Maps.

**Verdict:** Hand-roll 5 lines in `WorldStage._gameTick`. No tween library.

```typescript
// In WorldStage: parallel Map<Container, number> for dying entities
// Each tick:
container.alpha = dyingTimer / FADE_DURATION_MS;
if (dyingTimer <= 0) this._removeEntity(container);
```

`pixi-actions` v1.2.4 (latest on npm, PixiJS v8 compatible via `app.ticker.add((tick) => Actions.tick(tick.deltaTime/60))`) works but adds a runtime dependency for a use case that is simpler to implement inline. The `container.alpha` property on PixiJS v8 `Container` is first-class — no filter layer needed.

---

## Recommended Stack (Complete Picture)

### Core Technologies — All Unchanged

| Technology | Version | Purpose |
|------------|---------|---------|
| PixiJS | ^8.16.0 | Rendering, game loop ticker, container alpha |
| Express | ^5.2.0 | API proxy — gains `/api/interactions` route |
| @anthropic-ai/sdk | ^0.82.0 | Haiku calls for both recognition and interaction analysis |
| TypeScript | ^5.0.0 | Shared types gain InteractionMap, EntitySnapshot |
| Vite | ^6.0.0 | Client bundler, unchanged |
| pixi-filters | ^6.1.5 | Already installed, not needed for fade (container.alpha suffices) |
| Vitest | ^3.0.0 | Unit tests for new chase/flee behaviors |

### New Dependencies

**None.**

---

## Installation

```bash
# No new packages required for v1.1.
# pnpm install is a no-op — all capabilities exist in the current tree.
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Single `messages.create` with entity list | `messages.batches` API | Batches are async (up to 24h turnaround) — incompatible with real-time round system |
| Hand-roll fade (`container.alpha`) | pixi-actions ^1.2.4 | Adds a dep for a single use case that is 5 lines inline; pixi-actions otherwise unused |
| Linear scan for nearest target | rbush / kd-tree spatial index | Correct at <50 entities; adds complexity for zero performance benefit |
| Extend behavior contract with optional `others` param | Separate targeting system / ECS refactor | Preserves pure function contract, Colyseus compatibility, and all 47 existing tests |
| PixiJS Ticker for round countdown | `setInterval` / `setTimeout` | Ticker-based keeps everything in the game loop; avoids browser timer drift and teardown races |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Anthropic Message Batches API | Async 24h workload API — blocks real-time round flow entirely | Standard `messages.create` with entity names as user content |
| pixi-actions | Runtime dep for a fade pattern trivially hand-rolled in 5 lines | `container.alpha` decremented per tick with a `dyingTimer` Map |
| ECS frameworks (bitecs, miniplex) | Architectural mismatch; would require rewriting all 6 behavior modules and breaking Colyseus compatibility plan | Keep `(state, dt, world, others?) => state` pure function contract |
| Redux / Zustand | No React; overkill for flat entity Maps | TypeScript Maps in WorldStage |
| WebSockets for interaction sync | No multiplayer in v1.1 | `POST /api/interactions` — one HTTP call per round start |

---

## Integration Points (What Changes in the Codebase)

| File | Change |
|------|--------|
| `shared/src/types.ts` | Add `InteractionType`, `InteractionMap`, `EntitySnapshot` |
| `server/src/routes/interactions.ts` | New route — POST receives `string[]`, returns `InteractionMap` |
| `server/src/index.ts` | Register new `/api/interactions` route |
| `client/src/world/WorldStage.ts` | Accept `InteractionMap`, track `dyingTimer` Map, add `_removeEntity()` helper, pass `others` snapshot to dispatcher |
| `client/src/world/EntitySimulation.ts` | `dispatchBehavior` gains optional `others?: EntitySnapshot[]` param |
| `client/src/world/behaviors/chasingBehavior.ts` | New — pure steer-toward function |
| `client/src/world/behaviors/fleeingBehavior.ts` | New — pure steer-away function |
| `client/src/world/RoundManager.ts` | New — round state machine, countdown, interaction fetch |
| `client/src/main.ts` | Wire "Start Round" button to RoundManager |
| `server/tests/interactions.test.ts` | Tests for new interaction route and InteractionMap validation |
| `server/tests/behaviors.test.ts` | Tests for chase/flee behavior functions |

---

## Version Compatibility

| Package | Verified Version | Notes |
|---------|-----------------|-------|
| @anthropic-ai/sdk | 0.82.0 | Verified via npm show, current as of 2026-04-07 |
| pixi-filters | 6.1.5 | Verified via npm show, compatible with pixi.js ^8.16.0 |
| pixi-actions | 1.2.4 | Verified via npm show — PixiJS v8 compatible, NOT recommended for this project |

---

## Sources

- npm registry `npm show @anthropic-ai/sdk version` — HIGH confidence (direct)
- npm registry `npm show pixi-actions version` — HIGH confidence (direct)
- Anthropic API docs — Message Batches API documented as async/24h — MEDIUM confidence
- Codebase analysis (WorldStage.ts, EntitySimulation.ts, behaviors/*.ts) — HIGH confidence (direct read)

---
*Stack research for: Crayon World v1.1 — entity interactions & round system*
*Researched: 2026-04-07*
