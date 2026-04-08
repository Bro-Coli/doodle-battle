# Phase 8: Interaction Behaviors - Research

**Researched:** 2026-04-07
**Domain:** Game simulation steering behaviors, PixiJS ticker integration, interaction matrix lookup
**Confidence:** HIGH — all findings derived from direct code inspection of the existing codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Proximity-triggered** — chase and flee activate only within detection range; outside range, entities resume archetype behavior
- When actively chasing/fleeing, the interaction force **completely overrides** archetype movement
- Nearest target wins when multiple targets are in detection range
- **Attacker always deals damage** — entity with `fight` relationship deals 1 damage on contact; defender does not deal damage back yet
- **HP system**: every entity starts with HP=1; architecture must support HP>1 later
- HP=0 → `removeEntity()` triggers 0.5s fade-out
- **Fight proximity threshold: ~30px**
- **One hit per contact** — attacker must move away and re-approach for another hit (relevant for future HP>1)
- One-sided fights: only the entity with `fight` relationship approaches; the other holds its archetype behavior
- Symbiotic entities **drift toward + stay near** — gentle steering, no speed boost
- Symbiosis is **proximity-triggered** — only drift toward each other within detection range
- **Rooted entities cannot move** — interaction movement overrides are ignored for `rooted` archetype
- **Stationary entities cannot move** — same; they can be targeted but cannot respond with movement
- When no target in detection range → **resume archetype behavior** ("idle mode")

### Claude's Discretion

- Detection range threshold (research suggests ~200px)
- Chase/flee steering speed (should match or exceed entity's base speed)
- Symbiosis approach speed (gentler than chase)
- How "one hit per contact" cooldown works (distance-based vs time-based)
- How interaction logic integrates with existing `_gameTick` loop (post-dispatch pass vs replacement)
- HP field location (on EntityState vs separate map)

### Deferred Ideas (OUT OF SCOPE)

- HP > 1 / health bars
- Defender deals damage back
- Speed boost from symbiosis
- Detection range per entity (global range only for now)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTR-01 | Predator entities chase prey using steering behavior | Steering math in Architecture Patterns; integration point in `_gameTick` documented |
| INTR-02 | Prey entities flee from their predators | Same steering, opposite direction; handled by same function with sign flip |
| INTR-03 | Hostile entity pairs fight when in proximity — loser removed | `fight` type in `InteractionType`; `removeEntity()` already public and idempotent; HP field needed on state |
| INTR-04 | Symbiotic entities move toward each other and coexist | Gentle seek steering; damped when close; same detection range system |
| INTR-05 | Neutral entities ignore each other and continue archetype behavior | Default path when no target in range — existing `dispatchBehavior` runs unchanged |
</phase_requirements>

---

## Summary

Phase 8 adds a second pass inside `_gameTick` that reads `_interactionMatrix`, finds the closest relevant target for each entity, and either overrides archetype movement (chase/flee/befriend) or removes entities on contact (fight). When no target is in range, the existing `dispatchBehavior` runs unchanged (INTR-05 is free).

The most complex sub-problem is the **ID-to-container lookup bridge**. The `InteractionMatrix` uses integer string IDs (`'0'`, `'1'`, ...) assigned by the server at batch-prompt time, but the runtime maps (`_entityStates`, `_entityProfiles`) are keyed by `Container`. A stable name-to-ID mapping must be built when the round starts (when `startRound` resolves the matrix) and maintained until `_endRound`. Container profiles use `profile.name` which is stable.

The second design question is **HP field placement**. EntityState types are pure data; adding an `hp` field to each archetype state is the cleanest option and keeps the state/behavior contract intact.

**Primary recommendation:** Add a `resolveInteraction()` helper that, given an entity container, looks up its name-ID, finds the closest in-range container with a non-ignore relationship, and returns `{ type, target }`. The `_gameTick` calls this helper per entity; if a target is found, it replaces the archetype dispatch result with a steered position update. This is a pure post-dispatch replacement path, not a modification of the existing behavior functions.

---

## Standard Stack

### Core (already in place)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PixiJS | v8 | Container positioning, Ticker | Established — `_gameTick` already uses `Ticker.deltaMS` |
| TypeScript (strict) | ~5.x | Types for all new state | Project-wide strict mode |
| Vitest | ^3.0.0 | Unit tests in `server/tests/` | Existing test infra |

No new library dependencies needed. All interaction math is plain arithmetic.

### No New Dependencies

Steering behaviors (seek, flee, arrive) are 4-line math expressions. The existing `wrapPosition` utility handles bounds. No physics engine, no pathfinding library, no additional package to install.

---

## Architecture Patterns

### Recommended File Structure

```
client/src/world/
├── EntitySimulation.ts          # Add hp field to EntityState types
├── WorldStage.ts                # Add _nameIdMap, _entityHp; extend _gameTick
├── interactionBehaviors.ts      # NEW: resolveInteraction(), steerToward(), steerAway(), steerBefriend()
└── behaviors/                   # UNCHANGED — pure archetype functions stay as-is
```

### Pattern 1: ID-to-Name Lookup Bridge

**What:** When `startRound` resolves the interaction matrix, build a `Map<string, string>` from entity name to the integer string ID that the server assigned. At runtime, look up a container's profile name to get its ID, then query the matrix.

**Critical insight:** The server assigns IDs positionally from `uniqueProfiles` (deduplication order). The client sends profiles via `Array.from(this._entityProfiles.values())`. The order of that array determines which entity gets which ID. The matrix entries use those same IDs.

**Lookup pattern (derived from existing code):**

```typescript
// Source: direct inspection of server/src/routes/interactions.ts lines 52-56
// and mock-interactions.ts ID semantics

// Built once when matrix arrives, keyed by profile.name
// Maps name → entityId string (e.g. "Wolf" → "0")
private _nameIdMap = new Map<string, string>();

private _buildNameIdMap(profiles: EntityProfile[]): void {
  // Deduplicate by name (mirrors server deduplication)
  const seen = new Set<string>();
  const unique: EntityProfile[] = [];
  for (const p of profiles) {
    if (!seen.has(p.name)) { seen.add(p.name); unique.push(p); }
  }
  this._nameIdMap.clear();
  unique.forEach((p, i) => this._nameIdMap.set(p.name, String(i)));
}
```

Call `_buildNameIdMap` immediately after the matrix resolves in `startRound`, before transitioning to `simulating`.

### Pattern 2: Interaction Resolution Per Entity

**What:** For a given entity container, find the closest other container whose relationship toward it (or from it) is actionable.

```typescript
// Source: derived from CONTEXT.md decisions + InteractionMatrix type structure
// in shared/src/types.ts

interface ResolvedInteraction {
  type: InteractionType; // 'chase' | 'flee' | 'fight' | 'befriend'
  targetContainer: Container;
  distance: number;
}

function resolveInteraction(
  selfContainer: Container,
  entityStates: Map<Container, EntityState>,
  entityProfiles: Map<Container, EntityProfile>,
  dyingEntities: Set<Container>,
  matrix: InteractionMatrix,
  nameIdMap: Map<string, string>,
  detectionRange: number,
): ResolvedInteraction | null {
  const selfProfile = entityProfiles.get(selfContainer);
  if (!selfProfile) return null;
  const selfId = nameIdMap.get(selfProfile.name);
  if (!selfId) return null;

  const selfEntry = matrix.entries.find(e => e.entityId === selfId);
  if (!selfEntry) return null;

  const selfState = entityStates.get(selfContainer);
  if (!selfState) return null;

  let best: ResolvedInteraction | null = null;

  for (const [otherContainer, otherState] of entityStates) {
    if (otherContainer === selfContainer) continue;
    if (dyingEntities.has(otherContainer)) continue;

    const otherProfile = entityProfiles.get(otherContainer);
    if (!otherProfile) continue;
    const otherId = nameIdMap.get(otherProfile.name);
    if (!otherId) return null;

    const rel = selfEntry.relationships[otherId];
    if (!rel || rel === 'ignore') continue;

    const dx = otherState.x - selfState.x;
    const dy = otherState.y - selfState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > detectionRange) continue;
    if (!best || dist < best.distance) {
      best = { type: rel, targetContainer: otherContainer, distance: dist };
    }
  }

  return best;
}
```

### Pattern 3: Steering Functions

**What:** Pure functions that return a new `{x, y, vx, vy}` overlay. The `_gameTick` applies these in place of (or after) archetype dispatch.

```typescript
// Seek steering — moves entity directly toward target at given speed
// Returns updated x, y after one dt step
function seekPosition(
  sx: number, sy: number,         // self position
  tx: number, ty: number,         // target position
  speed: number,                  // pixels/second
  dt: number,
): { x: number; y: number; vx: number; vy: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return { x: sx, y: sy, vx: 0, vy: 0 };
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;
  return { x: sx + vx * dt, y: sy + vy * dt, vx, vy };
}

// Flee — opposite direction
function fleePosition(sx, sy, tx, ty, speed, dt) {
  return seekPosition(sx, sy, sx - (tx - sx), sy - (ty - sy), speed, dt);
}

// Befriend — seek with damping when close (arrive behavior)
function befriendPosition(sx, sy, tx, ty, speed, dt, arriveRadius = 60) {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return { x: sx, y: sy, vx: 0, vy: 0 };
  // Slow down as we approach
  const scaledSpeed = dist < arriveRadius ? speed * (dist / arriveRadius) : speed;
  const vx = (dx / dist) * scaledSpeed;
  const vy = (dy / dist) * scaledSpeed;
  return { x: sx + vx * dt, y: sy + vy * dt, vx, vy };
}
```

### Pattern 4: HP Field Placement

**Recommendation (Claude's discretion):** Store HP in a separate `Map<Container, number>` on `WorldStage` (`_entityHp`), not on `EntityState`. This avoids touching the 6 existing archetype state interfaces and keeps behavior functions pure. The map is set to 1 for every entity on spawn and deleted in `removeEntity()`.

```typescript
// WorldStage additions
private readonly _entityHp = new Map<Container, number>();

// In spawnEntity():
this._entityHp.set(entity, 1);

// In removeEntity() — delete before destroy():
this._entityHp.delete(container);

// Fight damage:
const currentHp = this._entityHp.get(targetContainer) ?? 1;
const newHp = currentHp - 1;
this._entityHp.set(targetContainer, newHp);
if (newHp <= 0) this.removeEntity(targetContainer);
```

This approach satisfies "architecture supports HP>1 later" without any state interface changes.

### Pattern 5: Fight Contact Cooldown

**Recommendation (Claude's discretion):** Distance-based cooldown — after a hit lands (proximity < 30px), the attacker's entry in the matrix is temporarily suppressed by a per-pair cooldown `Map<string, number>` (key: `"attackerId:targetId"`, value: ms remaining). On each tick, cooldowns decrement. While on cooldown, that pair's `fight` relationship is treated as `ignore`. This avoids a timer requiring `Date.now()` and integrates cleanly with `dt`.

```typescript
private readonly _fightCooldowns = new Map<string, number>(); // key: "aId:bId", value: ms remaining

// In _gameTick, after fight contact:
const cooldownKey = `${selfId}:${otherId}`;
this._fightCooldowns.set(cooldownKey, 2000); // 2000ms cooldown

// Per tick, decrement all cooldowns:
for (const [key, remaining] of this._fightCooldowns) {
  const next = remaining - ticker.deltaMS;
  if (next <= 0) this._fightCooldowns.delete(key);
  else this._fightCooldowns.set(key, next);
}
```

### Pattern 6: Two-Mode Game Tick Integration

**What:** The `_gameTick` loop already iterates `_entityStates`. Phase 8 inserts an interaction pass that either replaces the archetype result or applies a position override.

```typescript
// In _gameTick, replacing the existing dispatchBehavior call site:

const resolved = this._interactionMatrix
  ? resolveInteraction(container, this._entityStates, this._entityProfiles,
      this._dyingEntities, this._interactionMatrix, this._nameIdMap, DETECTION_RANGE)
  : null;

let newState: EntityState;

const isMovable = state.archetype !== 'rooted' && state.archetype !== 'stationary';

if (resolved && isMovable) {
  // Interaction mode: override archetype behavior with steering
  const targetState = this._entityStates.get(resolved.targetContainer)!;
  newState = applyInteractionSteering(state, resolved.type, targetState, dt);

  // Fight contact check
  if (resolved.type === 'fight' && resolved.distance < FIGHT_PROXIMITY_PX) {
    this._handleFightContact(container, resolved.targetContainer);
  }
} else {
  // Idle mode: normal archetype behavior
  newState = dispatchBehavior(state, dt, world);
}
```

### Anti-Patterns to Avoid

- **Modifying existing behavior functions**: Do not touch `walkingBehavior.ts` etc. Interaction is a separate layer.
- **Mutating EntityState archetype fields**: The `archetype` discriminator must not change. Apply position overrides as a new state spread.
- **Using entity names as matrix keys at runtime**: The matrix uses integer IDs; always route through `_nameIdMap`.
- **Calling `removeEntity()` twice on same container**: It is already idempotent via `_dyingEntities` guard, but fight logic should still guard against calling it on dying entities.
- **Spreading copies having different IDs**: Copies share the parent's profile name (`profile.name` is the same), so their `_nameIdMap` lookup returns the same ID — this is correct; interaction matrix is per-name, not per-container.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entity removal | Custom fade/destroy | `removeEntity()` (already public on WorldStage) | Handles all 5 maps, GPU texture cleanup, idempotent dying guard |
| HP decay animation | Custom health bar widget | Nothing yet (deferred) | HP>1 / health bars are explicitly deferred |
| Pathfinding | A* or navmesh | Direct seek steering | Flat canvas, no obstacles — steering is sufficient |
| Distance calculation | Bespoke spatial index | Brute-force O(n²) loop | Entity cap is 8-10; O(n²) is trivially fast |
| Timer management | `setInterval` / `setTimeout` | `ticker.deltaMS`-based cooldown | Stays on the game loop, pauses naturally when simulating stops |

---

## Common Pitfalls

### Pitfall 1: ID Mismatch Between Client and Server

**What goes wrong:** The server assigns integer IDs based on `uniqueProfiles` deduplication order. The client builds `_nameIdMap` from `Array.from(this._entityProfiles.values())`. If client and server deduplicate in different orders, IDs mismatch and relationships resolve to wrong pairs.

**Why it happens:** The server deduplicates `entities as EntityProfile[]` in insertion order. The client iterates `_entityProfiles` which is a `Map` (insertion-order stable in JS). Both iterate in insertion order — same order if the client sends profiles in the same order it inserted them. This should be stable, but must be verified.

**How to avoid:** Build `_nameIdMap` using the same deduplication logic as the server (seen-Set, insertion order), applied to the same `profiles` array that was sent to the server. Do not re-sort or re-filter the array.

**Warning signs:** Chase/flee relationships appear reversed (prey chases predator) or interactions don't trigger at all.

### Pitfall 2: Interaction Logic Runs on Dying Entities

**What goes wrong:** An entity that has started fading out (added to `_dyingEntities`) is still in `_entityStates` during its 0.5s fade. If fight logic runs on it, it could call `removeEntity()` again or find it as a valid target.

**Why it happens:** `removeEntity()` adds to `_dyingEntities` but only deletes from all maps after fade completes (in the `fadeOut` ticker callback).

**How to avoid:** `resolveInteraction()` already skips containers in `dyingEntities`. The `_gameTick` outer loop also skips dying entities via the existing guard (`if (this._dyingEntities.has(container)) continue`). Both guards together prevent the issue.

### Pitfall 3: Rooted/Stationary Entities Moved by Interaction

**What goes wrong:** A fire entity with `fight` toward an oak. If the interaction pass runs on the oak (which has `flee` toward fire), and the steering function moves `rooted` entities, the oak drifts from its origin — breaking the rooted sway behavior.

**Why it happens:** The `isMovable` guard is missing or checked incorrectly.

**How to avoid:** `isMovable = state.archetype !== 'rooted' && state.archetype !== 'stationary'`. Apply interaction steering only when `isMovable` is true. Rooted/stationary entities always run `dispatchBehavior` regardless of interaction resolution.

### Pitfall 4: Fight Resolution Race on Same Pair

**What goes wrong:** Fire has `fight` toward oak and oak has `ignore` toward fire. On the same tick where fire reaches 30px proximity, if both containers are iterated (fire removes oak, then oak's turn tries to process — but oak may already be dying). Or if two entities both have `fight` toward each other, both could call `removeEntity` on the other simultaneously.

**Why it happens:** Mutual-fight case + same-tick iteration.

**How to avoid:** `removeEntity()` is idempotent — the `_dyingEntities` guard prevents double-fade. For the mutual fight case, add the fight cooldown before the tick processes the other entity in the same loop iteration. Since both containers are in the same `for...of` loop, the second entity still gets processed but the cooldown/dying guard prevents double-removal.

### Pitfall 5: Detection Range Cross-World-Wrap

**What goes wrong:** An entity at x=10 and a target at x=790 on an 800px-wide canvas are actually 20px apart (torus topology), but Euclidean distance gives 780px — entity never detects target.

**Why it happens:** The world uses `wrapPosition` (torus topology) but straight Euclidean distance doesn't account for wrap.

**How to avoid for now:** Detection range of 200px is well under half the canvas width (~600px wide). At ~200px detection range, cross-wrap detection is rarely needed in practice. Flag this as a known limitation. A full fix would compute `min(|dx|, W-|dx|)` for wrapped distance — acceptable future improvement.

---

## Code Examples

### DETECTION_RANGE Constant

```typescript
// interactionBehaviors.ts
export const DETECTION_RANGE = 200; // pixels
export const FIGHT_PROXIMITY_PX = 30; // pixels
export const FIGHT_COOLDOWN_MS = 2000; // ms
export const BEFRIEND_ARRIVE_RADIUS = 60; // slow down within this px of target
```

### Applying Steering to EntityState (Spread Pattern)

```typescript
// Source: derived from existing EntityState spread pattern in behaviors/*.ts
// Preserves all archetype-specific fields; only overwrites x, y, vx, vy
function applySeekToState(state: EntityState, steer: {x: number; y: number; vx: number; vy: number}): EntityState {
  return { ...state, x: steer.x, y: steer.y,
    // vx/vy only exist on walking, flying, drifting — spread is safe regardless
    ...(('vx' in state) ? { vx: steer.vx, vy: steer.vy } : {}),
  };
}
```

### `_gameTick` Integration Sketch

```typescript
// In WorldStage._gameTick — replaces existing dispatchBehavior call

// Decrement fight cooldowns
for (const [key, remaining] of this._fightCooldowns) {
  const next = remaining - ticker.deltaMS;
  if (next <= 0) this._fightCooldowns.delete(key);
  else this._fightCooldowns.set(key, next);
}

for (const [container, state] of this._entityStates) {
  if (this._dyingEntities.has(container)) continue;

  const isMovable = state.archetype !== 'rooted' && state.archetype !== 'stationary';

  const resolved = (this._interactionMatrix && isMovable)
    ? resolveInteraction(container, /* ...args */ )
    : null;

  let newState: EntityState;

  if (resolved) {
    const targetState = this._entityStates.get(resolved.targetContainer)!;
    newState = applyInteractionSteering(state, resolved, targetState, dt);

    if (resolved.type === 'fight' && resolved.distance < FIGHT_PROXIMITY_PX) {
      this._handleFightContact(container, resolved.targetContainer);
    }
  } else {
    newState = dispatchBehavior(state, dt, world);
  }

  // ... existing position write, orientation, label sync
  this._entityStates.set(container, newState);
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.0 |
| Config file | `server/vitest.config.ts` |
| Quick run command | `cd server && pnpm test` |
| Full suite command | `cd server && pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTR-01 | Chase steering moves entity toward target | unit | `cd server && pnpm test -- --reporter=verbose` | ❌ Wave 0 |
| INTR-02 | Flee steering moves entity away from target | unit | `cd server && pnpm test -- --reporter=verbose` | ❌ Wave 0 |
| INTR-03 | Fight contact calls removeEntity on defender | unit | `cd server && pnpm test -- --reporter=verbose` | ❌ Wave 0 |
| INTR-04 | Befriend steering moves entity toward target with damping | unit | `cd server && pnpm test -- --reporter=verbose` | ❌ Wave 0 |
| INTR-05 | Entity with no in-range targets runs archetype dispatch unchanged | unit | `cd server && pnpm test -- --reporter=verbose` | ❌ Wave 0 |

All tests live in `server/tests/` — consistent with `behaviors.test.ts` which already imports from `client/src/world/` using relative paths. New interaction tests follow the same pattern.

### Sampling Rate

- **Per task commit:** `cd /Users/axelpothier/Documents/Code/GameDev/Drawing\ Game/server && pnpm test`
- **Per wave merge:** `cd /Users/axelpothier/Documents/Code/GameDev/Drawing\ Game/server && pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/tests/interactionBehaviors.test.ts` — covers INTR-01, INTR-02, INTR-03, INTR-04, INTR-05 (pure function tests for steering math and resolveInteraction)

*(Note: `WorldStage._gameTick` integration cannot be unit-tested without PixiJS mocks — visual verification covers that path)*

---

## Open Questions

1. **Speed for chase/flee steering**
   - What we know: Entity `speed` field maps 1-10 to 20-200 px/s (walking), 40-200 px/s (flying)
   - What's unclear: Should interaction speed equal or exceed the entity's base archetype speed?
   - Recommendation: Use `state.speed` directly from EntityState where available (walking, flying, drifting have it); for archetypes without a `speed` field (rooted, stationary — but these are excluded from interaction movement), default to 80px/s. Chase speed = `state.speed`; flee speed = `state.speed * 1.1` (slightly faster than chase so prey can escape); befriend speed = `state.speed * 0.5`.

2. **Interaction matrix availability during tick**
   - What we know: `_interactionMatrix` is set to `null` in `_endRound()`. The tick checks `_roundPhase !== 'simulating'` first and returns early. So the matrix is non-null only during simulation.
   - What's unclear: Is there a race window where phase = simulating but matrix is null?
   - Recommendation: In `startRound`, ensure `_interactionMatrix` is set before `_roundPhase` transitions to `'simulating'`. Current code does this (matrix set first, then phase set). Safe.

3. **Spreading copy interaction**
   - What we know: Copies share the parent's `profile.name` → same ID in `_nameIdMap` → same matrix relationships
   - What's unclear: If fire chases oak, and oak has two spreading copies, does fire chase all of them or just the nearest?
   - Recommendation: Fire is one entity; it finds the nearest oak (original or copy) via the nearest-target-wins rule. Multiple oaks are independent containers — fire chases the closest one. This emerges naturally from `resolveInteraction()` picking the nearest matching target.

---

## Sources

### Primary (HIGH confidence)

- Direct inspection: `client/src/world/WorldStage.ts` — `_gameTick`, `_entityStates`, `_entityProfiles`, `_dyingEntities`, `removeEntity()`, `startRound()`
- Direct inspection: `client/src/world/EntitySimulation.ts` — all EntityState types, `dispatchBehavior`, `wrapPosition`, archetype speed ranges
- Direct inspection: `shared/src/types.ts` — `InteractionMatrix`, `EntityRelationship`, `InteractionType`
- Direct inspection: `server/src/routes/interactions.ts` — ID assignment logic (positional index after deduplication)
- Direct inspection: `server/src/mock-interactions.ts` — ID semantics confirmed
- Direct inspection: `server/tests/behaviors.test.ts` — test pattern (relative imports from client/src/world)
- Direct inspection: `server/vitest.config.ts` — test environment

### Secondary (MEDIUM confidence)

- Standard game dev steering behavior formulas (seek/flee/arrive) — well-established, no external source needed; derivation is elementary linear algebra

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing
- Architecture: HIGH — derived directly from live codebase
- Pitfalls: HIGH — identified from code structure (ID bridge, dying guard, rooted guard all directly observable)
- Steering math: HIGH — elementary vector arithmetic, no library-specific API risk

**Research date:** 2026-04-07
**Valid until:** 2026-05-01 (stable codebase, no external dependencies involved)
