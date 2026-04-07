# Architecture Research

**Domain:** Browser game — entity interaction & round system integration
**Researched:** 2026-04-07
**Confidence:** HIGH (based on direct codebase analysis)

## Existing Architecture Summary

Before describing what is new, the existing contracts that must not break:

- `EntityState` is a discriminated union of 6 per-archetype state types, each containing `{ x, y, archetype, ... }`
- `dispatchBehavior(state, dt, world) => state` is pure — no side effects, no PixiJS imports
- `WorldStage` owns all 5 Maps keyed by `Container`: `_entityStates`, `_entityTextures`, `_entityProfiles`, `_entityLabels`, `_entitySpriteHeights`
- `_gameTick` loops those maps, calls `dispatchBehavior`, writes `container.x/y`, handles spreading copy spawn signals via `pendingSpawn` flag
- Server has one route: `POST /api/recognize` — single image to single `EntityProfile`
- `EntityProfile` in `shared/src/types.ts` is the only cross-boundary type

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (client/)                                               │
│                                                                  │
│  ┌──────────┐    ┌──────────────────────────────────────────┐    │
│  │ Toolbar  │    │ WorldStage                               │    │
│  │ (HTML)   │    │  ┌────────────┐  ┌──────────────────┐   │    │
│  │          │    │  │ drawingRoot│  │ worldRoot        │   │    │
│  │ [Submit] │    │  └────────────┘  │  entity containers│   │    │
│  │ [Start   │    │                  │  entity labels   │   │    │
│  │  Round]  │    │  Maps (existing):└──────────────────┘   │    │
│  │ [Clear]  │    │  _entityStates (EntityState)            │    │
│  └────┬─────┘    │  _entityProfiles (EntityProfile)        │    │
│       │          │  _entityTextures / _labels / _heights   │    │
│       │          │                                         │    │
│       │          │  Maps (new):                            │    │
│       │          │  _relationships (name → relationships)  │    │
│       │          │  _pendingRemovals (Set<Container>)      │    │
│       │          │                                         │    │
│       │          │  State (new):                           │    │
│       │          │  _roundState (RoundPhase + timer)       │    │
│       │          │                                         │    │
│       │          │  _gameTick:                             │    │
│       │          │    dispatchBehavior (existing, pure)    │    │
│       │          │    applyInteractionForces (new, pure)   │    │
│       │          │    fade + removal pass (new)            │    │
│       │          └──────────────────────────────────────────┘    │
│       │                                                          │
│  ┌────▼───────────────────────┐                                  │
│  │ InteractionOverlay (new)   │                                  │
│  │ "Start Round" / timer / end│                                  │
│  └────────────────────────────┘                                  │
└──────────────┬───────────────────────────────────────────────────┘
               │ POST /api/interactions (new)
               │ POST /api/recognize (existing, unchanged)
┌──────────────▼───────────────────────────────────────────────────┐
│  Server (server/)                                                │
│                                                                  │
│  routes/recognize.ts    (existing — unchanged)                   │
│  routes/interactions.ts (new)                                    │
│    buildInteractionPrompt(profiles[]) → Haiku prompt             │
│    validateInteractionMatrix(raw) → InteractionMatrix | null     │
└──────────────────────────────────────────────────────────────────┘
```

---

## New Components

### 1. Shared type additions — `shared/src/types.ts`

`EntityProfile` is unchanged. Add three types:

```typescript
export type InteractionType = 'chase' | 'flee' | 'fight' | 'symbiosis' | 'ignore';

export interface EntityRelationship {
  from: string;  // EntityProfile.name of the acting entity
  to: string;    // EntityProfile.name of the target entity
  type: InteractionType;
}

export interface InteractionMatrix {
  relationships: EntityRelationship[];
}
```

Keyed by name (not Container ID) so the server never sees PixiJS objects. `EntityProfile.name` is already the cache key in the recognize route, making it the natural join key.

### 2. `POST /api/interactions` — server route (new file)

Accepts `{ profiles: EntityProfile[] }`. Returns `InteractionMatrix`.

Prompt strategy: send each entity's `name` and `traits` (no images — entities were already recognized). Ask Haiku to determine the relationship type for every unique ordered pair. Output strict JSON matching `InteractionMatrix`. Limit pairs to avoid token blowup: N entities produce N*(N-1) directional pairs, manageable up to ~15 entities.

Mock path: when `MOCK_AI=true`, return a hardcoded `InteractionMatrix` covering the names already in `mock-entities.ts`.

This is a separate route from `/api/recognize` to keep the single-entity recognition cache intact and avoid coupling batch analysis to per-entity recognition.

### 3. `RoundState` — owned by `WorldStage` (new internal state)

```typescript
type RoundPhase = 'idle' | 'analyzing' | 'simulating' | 'ended';

interface RoundState {
  phase: RoundPhase;
  roundNumber: number;
  timeRemaining: number;  // seconds, counts down during 'simulating'
  roundDuration: number;  // configurable, default 30
}
```

`WorldStage` initializes `_roundState` to `{ phase: 'idle', roundNumber: 0, ... }`. The game tick decrements `timeRemaining` when phase is `simulating`. When it hits 0, the phase transitions to `ended` and the fight resolution pass runs.

### 4. `_relationships` map — owned by `WorldStage` (new map)

```typescript
private _relationships = new Map<string, EntityRelationship[]>();
```

Key is `EntityProfile.name`. Value is all relationships where this entity is the `from` party. Populated once after `/api/interactions` responds. Survives round transitions (relationships are re-used next round unless new entities are added). Cleared only when a new interaction call is made.

Using entity name rather than Container reference means the map is valid even after containers are removed for defeated entities. It is also serializable (future Colyseus support).

### 5. `interactionBehavior.ts` — new pure module

```typescript
// client/src/world/behaviors/interactionBehavior.ts

export function applyInteractionForces(
  state: EntityState,
  myProfile: EntityProfile,
  allStates: ReadonlyMap<Container, EntityState>,
  allProfiles: ReadonlyMap<Container, EntityProfile>,
  relationships: ReadonlyMap<string, EntityRelationship[]>,
  world: WorldBounds
): { vx: number; vy: number }
```

Pure function — no PixiJS imports, no mutation. `WorldStage._gameTick` calls this after `dispatchBehavior`, then replaces velocity in the returned state. Applies only for `walking` and `flying` archetypes. `rooted`, `stationary`, `spreading`, `drifting` entities ignore interaction forces (or get a reduced influence multiplier).

Internal logic:
- Chase: steer toward nearest target matching a `chase` relationship
- Flee: steer away from nearest entity that has a `chase` relationship pointing at me
- Fight: same as chase — fight pairs close on each other; outcome resolved at round end
- Symbiosis: weak attraction toward symbiosis partner
- Ignore: no force adjustment

### 6. `InteractionOverlay` — new HTML overlay

```typescript
// client/src/world/InteractionOverlay.ts
```

Same pattern as `RecognitionOverlay` — creates and manages DOM elements. Responsible for:

- "Start Round" button — enabled when in world view and at least one entity exists
- Spinner while awaiting `/api/interactions`
- Round countdown timer display during `simulating` phase
- "Round Over" summary card showing survivor count, button to dismiss
- Exposes callbacks: `onStartRound`, `onRoundEnd`

### 7. Entity removal — new `WorldStage` method

```typescript
removeEntity(container: Container): void
```

Removes container and label from `_worldRoot`, destroys the captured texture copy, removes container from all 5 existing maps. The name-keyed `_relationships` map does not need cleanup — surviving entities may still have relationships with removed entities which resolve to no nearby target (harmless).

Fade-out is handled via a `_pendingRemovals: Map<Container, number>` (container to remaining alpha) checked each tick. When alpha reaches 0, `removeEntity` is called.

---

## Modified Components

### `WorldStage.ts` — three additions, one modified method

**New internal state:**
- `private _relationships = new Map<string, EntityRelationship[]>()`
- `private _roundState: RoundState = { phase: 'idle', ... }`
- `private _pendingRemovals = new Map<Container, number>()`

**New public methods:**
- `startRound(): Promise<void>` — collects profiles, calls `/api/interactions`, populates `_relationships`, transitions to `simulating`
- `removeEntity(container: Container): void` — cleanup from all maps

**Modified `_gameTick`:**

After the existing `dispatchBehavior` call, two new passes:

1. If phase is `simulating`: call `applyInteractionForces` and replace velocity in `newState`
2. Decrement `timeRemaining`; on expiry transition to `ended` and run fight resolution
3. Process `_pendingRemovals`: decrement alpha, call `removeEntity` at 0

The existing behavior — `dispatchBehavior`, position write, orientation, label sync, spreading copy spawn — is unchanged.

### `main.ts` — add "Start Round" button

Add `startRoundBtn` to toolbar. Wire to `worldStage.startRound()`. Disable when not in world view and when analyzing. Enable/disable logic follows the same pattern as existing toolbar state management. "Start Round" should also be disabled when zero entities exist.

### `shared/src/types.ts` — additive only

Three new exports. Zero changes to `EntityProfile` or `Archetype`. Both sides (client, server) pick up the new types via existing import paths.

### `EntitySimulation.ts` — unchanged

The pure behavior functions and dispatch table require no modification. Interaction forces are a post-dispatch concern owned entirely by `WorldStage`.

### `server/src/recognition/buildPrompt.ts` — add one function

Add `buildInteractionPrompt(profiles: EntityProfile[]): string` alongside the existing `SYSTEM_PROMPT` and `buildUserContent`. Keeps all prompt construction co-located.

---

## Data Flow

### Round Lifecycle

```
Entities accumulate via existing draw-submit-spawn pipeline
        │
Player clicks "Start Round"
        │
WorldStage.startRound()
  Collect EntityProfile[] from _entityProfiles.values()
  POST /api/interactions { profiles }
        │
Server: buildInteractionPrompt → Haiku → validateInteractionMatrix
        │
InteractionMatrix received
  _relationships populated from matrix
  _roundState.phase = 'simulating'
        │
_gameTick: dispatchBehavior + applyInteractionForces each frame
_roundState.timeRemaining counts down
        │
timeRemaining = 0
  _roundState.phase = 'ended'
  Fight resolution: find fighting pairs in proximity
    Lower-speed entity added to _pendingRemovals
        │
Fade-out over ~0.5s, then removeEntity for each loser
        │
InteractionOverlay shows "Round Over" card
  Survivor count displayed
  Player dismisses → _roundState.phase = 'idle', roundNumber++
        │
Player draws more entities, clicks "Start Round" again
  New interaction call with updated entity roster
  Survivors from previous round participate
```

### Fight Resolution (round end)

Resolution happens once at `ended` phase, not in real time. This avoids HP/combat state complexity.

For each pair `(A, B)` where `A fight B` and `B fight A` are both in `_relationships`:
- Find containers for A and B by scanning `_entityProfiles` values
- If A and B are within a proximity threshold (e.g., 150px), the fight is "engaged"
- Loser: entity with lower `EntityProfile.speed` (the faster entity wins)
- Loser added to `_pendingRemovals`
- If neither is within threshold, both survive (they never met)

This heuristic is simple and explainable: "the wolf beat the rabbit because it's faster." Tunable later.

### Symbiosis

During `simulating`, symbiosis pairs attract weakly. No removal at round end. Optional: cosmetic "pulse" at round end when two symbiosis partners are close. Can be deferred without blocking anything.

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `shared/types.ts` | Cross-boundary contracts | Modified (additive) |
| `server/routes/recognize.ts` | Single image to EntityProfile | Unchanged |
| `server/routes/interactions.ts` | Entity list to InteractionMatrix | New |
| `server/recognition/buildPrompt.ts` | Haiku prompt construction | Modified (additive) |
| `server/recognition/validateProfile.ts` | Response validation | Modified (additive) |
| `EntitySimulation.ts` | Pure archetype behavior dispatch | Unchanged |
| `world/behaviors/*.ts` | Per-archetype pure state update | Unchanged |
| `world/behaviors/interactionBehavior.ts` | Pure interaction force computation | New |
| `WorldStage.ts` | Entity lifecycle and game tick | Modified |
| `InteractionOverlay.ts` | Round UI (HTML overlay) | New |
| `main.ts` | Toolbar wiring | Modified |

---

## Recommended File Structure

```
shared/src/
└── types.ts                              # Add InteractionType, EntityRelationship, InteractionMatrix

server/src/
├── routes/
│   ├── recognize.ts                      # Unchanged
│   └── interactions.ts                   # New route
└── recognition/
    ├── buildPrompt.ts                    # Add buildInteractionPrompt()
    └── validateProfile.ts               # Add validateInteractionMatrix()

client/src/
└── world/
    ├── WorldStage.ts                     # Modified: round state, relationships, removal
    ├── EntitySimulation.ts               # Unchanged
    ├── InteractionOverlay.ts             # New
    └── behaviors/
        ├── walkingBehavior.ts            # Unchanged
        ├── flyingBehavior.ts             # Unchanged
        ├── rootedBehavior.ts             # Unchanged
        ├── spreadingBehavior.ts          # Unchanged
        ├── driftingBehavior.ts           # Unchanged
        ├── stationaryBehavior.ts         # Unchanged
        └── interactionBehavior.ts        # New
```

---

## Architectural Patterns

### Pattern 1: Post-dispatch velocity blending

**What:** `dispatchBehavior` runs first (archetype wander/movement), then interaction forces are blended in as a second pass in `WorldStage._gameTick`.

**When to use:** Keeps pure behavior functions completely unchanged and testable. Interaction forces are a world-manager concern, not an archetype concern.

**Trade-offs:** `WorldStage._gameTick` grows to handle two passes. Acceptable — the tick already handles spreading copy spawning as a side-effect pass.

```typescript
// In WorldStage._gameTick — illustrative, not final:
let newState = dispatchBehavior(state, dt, world);

if (this._roundState.phase === 'simulating') {
  const myProfile = this._entityProfiles.get(container);
  if (myProfile && (newState.archetype === 'walking' || newState.archetype === 'flying')) {
    const force = applyInteractionForces(
      newState, myProfile,
      this._entityStates, this._entityProfiles,
      this._relationships, world
    );
    newState = { ...newState, vx: force.vx, vy: force.vy };
  }
}
```

### Pattern 2: Name-keyed relationship map

**What:** `_relationships` is keyed by `EntityProfile.name`, not by `Container` reference. Position lookups resolve through the profile maps inside `applyInteractionForces`.

**When to use:** When entity containers are removed (death), the relationship data remains valid for surviving entities. Serializable for future Colyseus state sync.

### Pattern 3: Deferred fight resolution at round end

**What:** During simulation, fight pairs chase each other (interaction force). At round-end (timer 0), `WorldStage` resolves outcomes based on proximity and speed comparison, then marks losers for removal.

**When to use:** Fits the round-based structure. Avoids real-time HP/damage state entirely. Easy to tune: change the resolution metric (speed, archetype, traits) without changing the simulation loop.

---

## Anti-Patterns

### Anti-Pattern 1: Container references inside pure behavior functions

**What people do:** Add `target: Container | null` to `EntityState` so a chasing entity can store its PixiJS target.

**Why it is wrong:** Breaks the pure function contract. Creates PixiJS dependency inside `EntitySimulation`. Breaks future Colyseus compatibility where state must be serializable.

**Do this instead:** Express relationships as entity names in a separate map owned by `WorldStage`. Resolve names to positions inside `WorldStage._gameTick` before calling the pure interaction function.

### Anti-Pattern 2: Merging round state into EntityState

**What people do:** Add `isChasing: boolean`, `targetName: string` directly to `WalkingState` or `FlyingState`.

**Why it is wrong:** Bloats per-entity state, requires touching all 6 archetype types and their factory functions. Round-specific fields leak into what should be permanent entity identity.

**Do this instead:** Keep `EntityState` as archetype-pure movement state. Store interaction context separately in `WorldStage._relationships` and `_roundState`.

### Anti-Pattern 3: Eager interaction analysis per-entity at recognize time

**What people do:** Add relationship fields to `/api/recognize` response, computing them when each entity is submitted.

**Why it is wrong:** At recognize time, only one entity is known. Relationships require the full roster. Eager computation would require a new API call every time a new entity is added, multiplying cost and complexity.

**Do this instead:** Batch the interaction call at "Start Round" time when the entity roster is finalized.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic Haiku (batch) | `POST /api/interactions` — entity names + traits, no images | Much cheaper than per-entity calls. Server-side, API key stays hidden. |
| Anthropic Haiku (single) | `POST /api/recognize` (existing) | Unchanged. Still cached by name. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `WorldStage` to `interactionBehavior` | Direct function call (pure) | Passes positions as data, not containers |
| `WorldStage` to `InteractionOverlay` | Callback pattern | Same as existing `RecognitionOverlay` — overlay fires callbacks, stage acts |
| `WorldStage` to `main.ts` | `startRound()` method + round phase callbacks | Follows existing `toggle()` / `spawnEntity()` method pattern |
| `server/interactions.ts` to shared types | `InteractionMatrix` import | Same pattern as `EntityProfile` import in `recognize.ts` |

---

## Build Order

Each step has no unresolved imports when it starts.

1. **`shared/src/types.ts`** — Add interaction types. No dependencies. Start here.

2. **`server/src/recognition/buildPrompt.ts`** — Add `buildInteractionPrompt(profiles)`. Depends on step 1.

3. **`server/src/recognition/validateProfile.ts`** — Add `validateInteractionMatrix(raw)`. Depends on step 1.

4. **`server/src/routes/interactions.ts`** — Wire steps 2 and 3 into Express route. Register in `server/src/index.ts`. Testable in isolation with mock entities before any client work.

5. **`client/src/world/behaviors/interactionBehavior.ts`** — Pure function. Depends on shared types (step 1) and `EntitySimulation` types. No PixiJS.

6. **`WorldStage.ts`** — Add `_relationships`, `_roundState`, `_pendingRemovals`, `startRound()`, `removeEntity()`. Modify `_gameTick`. Depends on step 5.

7. **`client/src/world/InteractionOverlay.ts`** — HTML overlay. Depends on `WorldStage.startRound()` signature (step 6).

8. **`main.ts`** — Wire "Start Round" button and integrate `InteractionOverlay`. Depends on steps 6 and 7.

This order means the server interaction route (step 4) can be built and tested independently before any client changes, which matches the existing development pattern.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| PoC (1 player, ~10 entities) | Single batch Haiku call per round. In-memory maps. No persistence needed. |
| Multiplayer PoC (2-4 players, ~30 entities) | Colyseus room owns `_relationships` and `_roundState`. Behavior functions unchanged (pure contract holds). `WorldStage` becomes a rendering-only consumer of server-authoritative state. |
| Full game (50+ entities) | O(n^2) position scan in `applyInteractionForces` becomes noticeable. Replace with spatial grid or quadtree. Pure function contract survives the change. |

The first bottleneck will be interaction force computation at ~40+ entities. A simple grid resolves this without changing the behavior function signatures.

---

## Sources

- Direct codebase analysis: `WorldStage.ts`, `EntitySimulation.ts`, `shared/src/types.ts`, `server/src/routes/recognize.ts`, `client/src/main.ts`, all 6 behavior files
- `PROJECT.md` milestone spec: batch interaction call, round system, 4 interaction types, entity removal, survivor persistence
- Existing patterns referenced: `RecognitionOverlay` for overlay approach, `_spawnCopy` for in-tick side-effect handling via signal flag, `dispatchBehavior` contract for pure behavior convention

---
*Architecture research for: Crayon World v1.1 — Entity Interactions & Round System*
*Researched: 2026-04-07*
