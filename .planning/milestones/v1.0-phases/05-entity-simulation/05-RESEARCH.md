# Phase 5: Entity Simulation - Research

**Researched:** 2026-04-07
**Domain:** Game loop behavior simulation, PixiJS v8 Ticker, archetype state machines
**Confidence:** HIGH

## Summary

Phase 5 adds autonomous movement to every entity on the canvas. Six archetypes produce visibly distinct patterns driven by `app.ticker`. The simulation is fully delta-time based so motion is frame-rate independent. The core design constraint from the project is that behavior functions are pure and state is plain data — a critical pattern for future Colyseus multiplayer compatibility.

The phase has three distinct work streams: (1) extending `EntityProfile` with a `speed` field all the way through server validation, mock data, and the Claude prompt; (2) authoring six pure behavior functions (one per archetype); and (3) wiring the game loop in `WorldStage` to call the correct behavior function each tick, updating the entity's container position and rotation.

The codebase already has all scaffolding needed. `app.ticker` is already used for the fade-in animation in `EntitySprite.ts`. The pattern to extend is straightforward: give each entity a mutable state object alongside its container, update state each tick, and write the position/rotation onto the container.

**Primary recommendation:** Model entity movement as `(state, ticker) => newState` pure functions dispatched by archetype, with the container position written from state after each call. Keep all mutable state in a plain object per entity, never inside the Container itself.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Walking** (wolf, cat): Patrol wander — pick random direction, walk for a bit, pause briefly, pick new direction. Feels like an animal exploring territory.
- **Flying** (eagle, butterfly): Smooth sweeping arcs across the world. Faster than walkers, rarely stops. Soaring feel.
- **Spreading** (fire, moss): Periodically spawn smaller copies of itself at adjacent positions near the parent. No cap on copies but slow spawn rate. Copies don't spread further (no chain reaction). Copies stay near the parent entity — localized spread, not world-wide.
- **Drifting** (cloud, balloon): Slow, mostly-horizontal movement with gentle sine-wave vertical bobbing. Distinctly slower and floatier than walking. Wind-like feel.
- **Rooted** (tree, flower): Very subtle side-to-side sway animation. Stays in place but feels alive.
- **Stationary** (rock, landmark): Truly frozen — no movement or animation at all. Distinguished from rooted by having zero motion.
- **World boundary**: Wrap-around — entities exit one side and re-enter from the opposite side.
- **Fixed camera**: Single screen, no scrolling or panning (consistent with Phase 4 WorldStage).
- **Spreading copies**: Stay near their parent, not independently wrapping across the world.
- **AI speed parameter**: Extend `EntityProfile` with a `speed` field: numeric 1–10 scale returned by Claude. Simulation maps this to actual pixels/second base rate. Update Claude prompt, server validation, and mock entities.
- **Organic feel**: Each entity instance gets ~10–20% random variance on speed, pause duration, and turn frequency so two wolves don't move identically.
- **Traits are display-only**: Movement driven purely by archetype + speed value.
- **Sprite rotation**: Walking and flying entities rotate to face movement direction.
- **Flying bob**: Flying entities get a gentle sine-wave vertical bob.
- **Spreading copies**: Identical to original — same size, same opacity.
- **No trails, particles, or extra visual polish** for PoC.

### Claude's Discretion

- Exact speed-to-pixels/second mapping
- Patrol wander pause duration and direction change frequency
- Flying arc radius and curve tightness
- Spreading spawn interval and spawn radius
- Drifting sine-wave amplitude and frequency
- Rooted sway amplitude
- Exact variance ranges for instance randomization
- How spreading copies reuse the parent's texture

### Deferred Ideas (OUT OF SCOPE)

- Trait-influenced movement patterns (territorial, pack hunter modifiers)
- Entity interaction (chasing, fleeing, combat)
- Camera follow / pan
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENTY-02 | Entity moves according to its archetype (walking, flying, rooted, spreading, drifting, stationary) | Six behavior functions dispatched by archetype; delta-time movement via `ticker.deltaMS`; sprite rotation to face direction; spreading spawns copies via existing `spawnEntity` logic |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PixiJS | v8 (already installed) | Rendering + game loop via `app.ticker` | Already used in project; `Ticker` provides `deltaMS` and `deltaTime` |
| TypeScript | strict (already configured) | Type-safe entity state objects | Already project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pixi-filters | v6 (already installed) | Drop shadow (already on sprites) | Already used; no new filters needed for Phase 5 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure behavior functions + plain state objects | Class-based entity with update() method | Class approach is ergonomic but violates project principle "State is plain data" — breaks future Colyseus compatibility |
| `app.ticker` | `requestAnimationFrame` directly | `app.ticker` already integrated; `deltaMS` is accurate; no reason to bypass |
| In-container state (`container.userData`) | Separate state map keyed by container | `userData` is a PixiJS v8 escape hatch that works but makes state harder to serialize for future Colyseus work. Separate map is cleaner. |

**Installation:** No new packages needed. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

```
client/src/
├── world/
│   ├── WorldStage.ts          # Add game loop registration here (already exists)
│   ├── EntitySprite.ts        # Already exists — no changes needed for Phase 5
│   ├── EntitySimulation.ts    # NEW: EntityState type + behavior dispatch
│   ├── behaviors/
│   │   ├── walkingBehavior.ts
│   │   ├── flyingBehavior.ts
│   │   ├── rootedBehavior.ts
│   │   ├── spreadingBehavior.ts
│   │   ├── driftingBehavior.ts
│   │   └── stationaryBehavior.ts
│   ├── captureEntityTexture.ts  # Already exists
│   └── EntityTooltip.ts         # Already exists
shared/src/
└── types.ts                   # Add speed: number to EntityProfile
server/src/
├── recognition/
│   ├── buildPrompt.ts         # Add speed to JSON schema
│   └── validateProfile.ts     # Add speed validation (1–10)
└── mock-entities.ts           # Add speed values to 6 mock entities
```

### Pattern 1: EntityState — Plain Data Per Entity

**What:** Each entity has a companion plain-object state that carries all mutable simulation data. The Container itself is never extended or subclassed.

**When to use:** Always. This is the project's stated pattern — state is plain data for Colyseus compatibility.

```typescript
// client/src/world/EntitySimulation.ts

export interface WalkingState {
  archetype: 'walking';
  vx: number;         // pixels/sec
  vy: number;
  heading: number;    // radians
  speed: number;      // effective pixels/sec (from profile.speed mapped + variance)
  pauseTimer: number; // ms remaining in current pause (0 = moving)
  walkTimer: number;  // ms remaining in current walk segment
}

export interface FlyingState {
  archetype: 'flying';
  vx: number;
  vy: number;
  heading: number;
  angularVelocity: number; // radians/sec — arc curve
  speed: number;
  bobPhase: number;       // radians, accumulates over time for sine bob
  bobOriginY: number;     // Y position without bob offset (base Y)
}

export interface RootedState {
  archetype: 'rooted';
  originX: number;
  swayPhase: number;  // radians
}

export interface SpreadingState {
  archetype: 'spreading';
  spawnTimer: number; // ms until next copy spawn
  spawnInterval: number; // ms between spawns
  spawnRadius: number;  // pixels
  isACopy: boolean;     // copies never spread further
}

export interface DriftingState {
  archetype: 'drifting';
  vx: number;         // pixels/sec (mostly horizontal)
  bobPhase: number;
  bobAmplitude: number;
  bobOriginY: number;
}

export interface StationaryState {
  archetype: 'stationary';
}

export type EntityState =
  | WalkingState
  | FlyingState
  | RootedState
  | SpreadingState
  | DriftingState
  | StationaryState;
```

### Pattern 2: Behavior Function Signature

**What:** Each archetype has a pure function that takes state + context and returns new state (mutations allowed on a copy, not the original, for correctness).

**When to use:** One function per archetype file.

```typescript
// Behavior function contract
// Source: CLAUDE.md — "Behavior functions are pure"
export function updateWalking(
  state: WalkingState,
  container: Container,
  ticker: Ticker,
  world: { width: number; height: number },
): WalkingState {
  // return new state object — do not mutate the argument
  // write container.x, container.y, container.rotation as side-effect
}
```

Note: writing `container.x/y/rotation` is an intentional side-effect (rendering). State mutation is avoided on the input object.

### Pattern 3: Game Loop Registration in WorldStage

**What:** WorldStage holds a Map of `Container -> EntityState`. On `spawnEntity`, it initializes state and registers a single shared ticker listener that iterates all active entities.

**When to use:** Central game loop — one ticker listener, not one per entity.

```typescript
// Source: existing app.ticker pattern from EntitySprite.ts fade-in

// Single ticker for all entities (efficient):
private readonly _entityStates = new Map<Container, EntityState>();
private readonly _gameTick = (ticker: Ticker): void => {
  for (const [container, state] of this._entityStates) {
    const newState = dispatchBehavior(state, container, ticker, world);
    this._entityStates.set(container, newState);
  }
};

// Register once in constructor:
app.ticker.add(this._gameTick);
```

### Pattern 4: Speed Mapping (Claude's Discretion — Recommended)

Map the 1–10 speed value to pixels/second:

| Archetype | Speed 1 | Speed 5 | Speed 10 |
|-----------|---------|---------|----------|
| walking | 20 px/s | 60 px/s | 120 px/s |
| flying | 40 px/s | 100 px/s | 200 px/s |
| drifting | 8 px/s | 20 px/s | 40 px/s |

Formula: `baseSpeed = MIN + (speed - 1) / 9 * (MAX - MIN)`

Apply 10–20% variance per instance at init time: `effectiveSpeed = baseSpeed * (0.9 + Math.random() * 0.2)`.

### Pattern 5: Wrap-Around World Edges

```typescript
// Pure utility — no library needed
function wrapPosition(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return {
    x: x < 0 ? x + w : x > w ? x - w : x,
    y: y < 0 ? y + h : y > h ? y - h : y,
  };
}
```

Use `app.screen.width` and `app.screen.height` for world bounds.

### Pattern 6: Sprite Rotation to Face Movement Direction

```typescript
// For walking and flying entities
container.rotation = Math.atan2(vy, vx);
```

`Math.atan2(vy, vx)` returns the angle in radians from positive-X axis. PixiJS `rotation` is also in radians. This is the standard approach — no library needed.

### Pattern 7: Spreading Copy Spawn

Spreading behavior function needs a callback to spawn a copy, since spawning requires PixiJS API access (`addChild`, etc.) and cannot be a pure function. This breaks the pure-function pattern for this one archetype — the accepted solution is to have the spreading behavior function return a signal (e.g., `shouldSpawn: true`) and let the game loop handle the actual spawn.

```typescript
// Spreading state returns a flag
interface SpreadingState {
  // ...
  pendingSpawn: boolean;
}

// Game loop handles the spawn signal
if (state.archetype === 'spreading' && state.pendingSpawn && !state.isACopy) {
  spawnCopyNear(container, texture, app, worldRoot);
}
```

The copy reuses the parent's existing `Texture` object directly (same `Texture` reference — PixiJS `Sprite` can share textures safely since the texture data is on the GPU and Sprites just reference it).

### Anti-Patterns to Avoid

- **One ticker listener per entity:** Causes O(n) ticker registrations. Use one shared listener that iterates the entity map.
- **Storing simulation state on the Container:** Container is a render node, not a data node. Use a parallel Map.
- **Mutating input state object:** Return a new state object or at minimum a mutated copy. Input mutation makes debugging and future serialization harder.
- **Using `deltaTime` (dimensionless) for distance calculations:** Use `deltaMS / 1000` (seconds) for pixels-per-second math. `deltaTime` is a normalized scalar (1.0 at 60 FPS) — valid for angle increments but confusing for speed. Be consistent: `dx = vx * (ticker.deltaMS / 1000)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frame timing | Custom `performance.now()` loop | `ticker.deltaMS` from PixiJS | Already provided; handles min/maxFPS clamping |
| Sprite direction angle | Custom angle math | `Math.atan2(vy, vx)` (stdlib) | Zero dependencies, correct |
| World wrapping | Clamp + teleport | Simple modulo-like arithmetic | Three-line utility covers all cases |
| Sine wave animation | Third-party tween library | `Math.sin(phase)` + accumulated phase | No dependency needed for simple oscillation |
| Texture duplication for copies | `generateTexture` again | Reuse same `Texture` reference | Textures are GPU resources — sharing is correct and efficient |

**Key insight:** The full simulation for Phase 5 requires zero new npm packages. All math is elementary trigonometry and linear algebra, covered by the JS standard library.

---

## Common Pitfalls

### Pitfall 1: Using `deltaTime` for pixel-per-second speed math

**What goes wrong:** `vx * ticker.deltaTime` produces incorrect distances at non-60-FPS framerates. At 120 FPS, `deltaTime` is ~0.5, so the entity moves half as far per second as intended.

**Why it happens:** `deltaTime` is a frame-fraction scalar (1.0 at 60 FPS target), not a time value. It's useful for angle increments ("rotate by 0.01 per frame" scaled by `deltaTime`) but wrong for "move N pixels per second."

**How to avoid:** Use `ticker.deltaMS / 1000` to get seconds elapsed. Then `dx = vx_pixels_per_sec * (ticker.deltaMS / 1000)`.

**Warning signs:** Entities move faster on high-refresh-rate monitors.

### Pitfall 2: Multiple ticker registrations for one entity

**What goes wrong:** Each `spawnEntity` call adds a new ticker listener. With 10 entities, there are 10 listeners; with 50, there are 50. Each listener iterates nothing but wastes call overhead.

**Why it happens:** Following the same pattern as the fade-in animation (which registers one listener per entity, then removes it) but forgetting that movement listeners persist for the entity's lifetime.

**How to avoid:** Register a single game-loop listener in `WorldStage` constructor. Iterate `this._entityStates` map inside it.

**Warning signs:** DevTools performance profiler shows increasing ticker listeners as entities spawn.

### Pitfall 3: Spreading chain reaction

**What goes wrong:** Copies of a spreading entity also spread, causing exponential copy spawning.

**Why it happens:** Copy entities get the same archetype (`spreading`) and the same behavior function.

**How to avoid:** `SpreadingState.isACopy = true` flag. The behavior function (or game loop) checks this flag before emitting `pendingSpawn`.

**Warning signs:** Canvas fills with hundreds of entities within seconds.

### Pitfall 4: Spreading copies wrapping across the world

**What goes wrong:** Copies drift far from the parent because they inherit the wrap-around logic.

**Why it happens:** Spreading copies are treated like independent entities after spawn.

**How to avoid:** For copies, set `isACopy = true` in their state. Apply wrap-around to all entities — copies stay localized because their spawn radius is small. The constraint is that copies don't spread further, which prevents the "fire teleports across the world" effect. Wrap-around itself is fine for copies.

### Pitfall 5: Flying bob corrupting base Y position

**What goes wrong:** The sine bob adds an offset each frame rather than computing from a stable origin, causing the entity to drift vertically.

**Why it happens:** `container.y += Math.sin(phase) * amplitude` accumulates error every frame.

**How to avoid:** Store `bobOriginY` at spawn time. Each frame: `container.y = bobOriginY + Math.sin(bobPhase) * amplitude`. Never use `+=` for bob offset.

**Warning signs:** Flying entities gradually sink toward the bottom of the canvas.

### Pitfall 6: Rooted sway same pattern as flying bob (same root cause, same fix)

**What goes wrong:** Sway applied with `container.x += Math.sin(phase) * amplitude` drifts the entity horizontally.

**How to avoid:** Store `originX` at spawn. Use `container.x = originX + Math.sin(swayPhase) * amplitude`.

### Pitfall 7: Speed field missing from server validation causes silent default

**What goes wrong:** `speed` is returned by Claude but not validated, so invalid values (strings, out-of-range numbers) reach the simulation and cause `NaN` movement.

**How to avoid:** Add explicit validation in `validateProfile.ts`: `speed` must be a number in [1, 10]. Clamp if out-of-range, or default to 5 if absent.

---

## Code Examples

Verified patterns from existing project code and PixiJS v8 docs:

### Ticker callback pattern (from existing EntitySprite.ts)

```typescript
// Source: client/src/world/EntitySprite.ts — existing fade-in pattern
const fadeIn = (ticker: Ticker): void => {
  elapsed += ticker.deltaMS;
  entity.alpha = Math.min(1, elapsed / 300);
  if (entity.alpha >= 1) {
    app.ticker.remove(fadeIn);
  }
};
app.ticker.add(fadeIn);
```

For persistent movement, omit the `remove` call and use a Map-based loop instead.

### Delta-time movement (correct pattern)

```typescript
// deltaMS / 1000 = seconds elapsed
const dt = ticker.deltaMS / 1000;
container.x += state.vx * dt;
container.y += state.vy * dt;
```

### Wrap-around

```typescript
if (container.x < 0) container.x += app.screen.width;
if (container.x > app.screen.width) container.x -= app.screen.width;
if (container.y < 0) container.y += app.screen.height;
if (container.y > app.screen.height) container.y -= app.screen.height;
```

### Sine-wave bob (correct)

```typescript
// In FlyingState: bobPhase accumulates, bobOriginY is set at spawn
state.bobPhase += 2.5 * dt; // 2.5 rad/sec frequency
container.y = state.bobOriginY + Math.sin(state.bobPhase) * 8; // 8px amplitude
```

### Rotation to face direction

```typescript
if (Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01) {
  container.rotation = Math.atan2(state.vy, state.vx);
}
```

### Speed mapping

```typescript
// Maps speed 1–10 to a pixels/second range, with per-instance variance
function mapSpeed(profileSpeed: number, minPx: number, maxPx: number): number {
  const base = minPx + ((profileSpeed - 1) / 9) * (maxPx - minPx);
  const variance = 0.9 + Math.random() * 0.2; // 10–20% random variance
  return base * variance;
}
```

### Texture reuse for spreading copies

```typescript
// Spreading copies reuse the same Texture — no re-capture needed
// Source: PixiJS texture sharing — multiple Sprites can reference same Texture
const copySprite = new Sprite(parentTexture); // parentTexture passed by reference
```

### Speed field in shared type

```typescript
// shared/src/types.ts — add speed field
export interface EntityProfile {
  name: string;
  archetype: Archetype;
  traits: string[];
  role: string;
  speed: number; // 1–10 scale from Claude, maps to pixels/second in simulation
}
```

### Server-side speed validation

```typescript
// server/src/recognition/validateProfile.ts — add to validateEntityProfile
const rawSpeed = obj['speed'];
const speed = typeof rawSpeed === 'number' && rawSpeed >= 1 && rawSpeed <= 10
  ? Math.round(rawSpeed)
  : 5; // default mid-range if absent or invalid
```

### Claude prompt speed field

```typescript
// server/src/recognition/buildPrompt.ts — add to JSON schema
// "speed": number, // 1–10 how fast this entity moves in real life (1=snail, 10=cheetah)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One ticker per entity | One shared ticker iterating entity map | Standard game loop pattern | Better performance with many entities |
| Class-based entity with update() | Pure behavior functions + plain state | Project decision (Colyseus compatibility) | State is serializable |
| `deltaTime` (normalized) for all motion | `deltaMS / 1000` for px/sec, `deltaTime` for normalized | PixiJS v8 docs clarify | Frame-rate independent motion |

---

## Open Questions

1. **What happens to spreading entity state when app goes to draw mode?**
   - What we know: `worldRoot.visible = false` when in draw mode, but `app.ticker` still runs.
   - What's unclear: Should the game loop pause when in draw mode? Spreading spawn timer will still fire.
   - Recommendation: Allow simulation to continue running in the background during draw mode — entities are still "alive," just invisible. This is simpler and causes no visible bugs.

2. **Spreading copy count — does it need an upper bound?**
   - What we know: Context says "no cap on copies but slow spawn rate." Copies don't further spread.
   - What's unclear: With many entities on canvas, performance could degrade if there are hundreds of spreading entities.
   - Recommendation: Per the context, no cap. The slow spawn rate and PoC scope (hackathon, single player) make this acceptable. If needed, a soft cap can be added later.

3. **Should the game loop start immediately or only when the user enters world mode?**
   - What we know: `app.ticker` runs continuously. WorldStage constructor is the natural place to register the game loop listener.
   - What's unclear: If registered in constructor, it fires even before any entities exist.
   - Recommendation: Register in constructor — when `_entityStates` is empty, the loop is a no-op. No performance concern.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (server package only) |
| Config file | `server/vitest.config.ts` |
| Quick run command | `pnpm run test` (from repo root or server/) |
| Full suite command | `pnpm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENTY-02 | `speed` field validated (1–10, defaults to 5) | unit | `pnpm run test -- --reporter=verbose tests/validateProfile.test.ts` | ✅ (extend existing) |
| ENTY-02 | `speed` present in all mock entities | unit | `pnpm run test -- --reporter=verbose tests/mock.test.ts` | ✅ (extend existing) |
| ENTY-02 | Behavior functions return correct state shape | unit | `pnpm run test -- --reporter=verbose tests/behaviors.test.ts` | ❌ Wave 0 |
| ENTY-02 | Wrap-around utility works at all four edges | unit | `pnpm run test -- --reporter=verbose tests/behaviors.test.ts` | ❌ Wave 0 |
| ENTY-02 | Spreading copy flag prevents chain spawn | unit | `pnpm run test -- --reporter=verbose tests/behaviors.test.ts` | ❌ Wave 0 |

Note: behavior functions are pure functions with no PixiJS dependencies — they can be unit-tested in `node` environment without a DOM.

### Sampling Rate

- **Per task commit:** `pnpm run test`
- **Per wave merge:** `pnpm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/tests/behaviors.test.ts` — unit tests for pure behavior functions (walking wander state transitions, flying arc, rooted sway no-drift, spreading `pendingSpawn` flag logic, drifting bob no-drift, stationary no-op). These are server-side tests only if behavior logic is kept in shared or server; if purely client-side, they require a client test setup (Vitest + jsdom). **Recommended:** Keep behavior functions framework-agnostic (no PixiJS imports) so they can be tested in the existing `server/vitest.config.ts` node environment, or add a `client/vitest.config.ts`.
- [ ] Extend `server/tests/validateProfile.test.ts` — add test cases for `speed` field (valid, invalid, missing, out-of-range).
- [ ] Extend `server/tests/mock.test.ts` — add assertion that all 6 mock entities have `speed` in [1, 10].

---

## Sources

### Primary (HIGH confidence)

- PixiJS v8 Ticker guide — https://pixijs.com/8.x/guides/components/ticker — `deltaMS`, `deltaTime`, `add`/`remove` patterns
- PixiJS v8 Ticker API — https://pixijs.download/v8.10.0/docs/ticker.html — `deltaMS` and `deltaTime` property definitions
- Existing codebase: `client/src/world/EntitySprite.ts` — confirmed `app.ticker.add(fn)` pattern with `ticker.deltaMS`
- Existing codebase: `shared/src/types.ts` — confirmed `EntityProfile` structure to extend
- Existing codebase: `client/src/world/WorldStage.ts` — confirmed `spawnEntity` integration point and `_worldRoot` container structure

### Secondary (MEDIUM confidence)

- Steering Behaviors for Autonomous Characters (Craig Reynolds GDC99) — https://www.red3d.com/cwr/steer/gdc99/ — foundational wander algorithm referenced
- PixiJS texture sharing — https://github.com/pixijs/pixijs/issues/199 — confirmed multiple Sprites can share same Texture reference

### Tertiary (LOW confidence)

- Game loop TypeScript patterns — https://dev.to/stormsidali2001/building-a-professional-game-loop-in-typescript-from-basic-to-advanced-implementation-eo8 — corroborates single-ticker approach

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from existing codebase; no new libraries
- Architecture: HIGH — patterns derived from existing code and PixiJS v8 official docs
- Behavior math: HIGH — standard trig, well-understood wander/patrol/sine patterns
- Pitfalls: HIGH — derived from direct code inspection of existing patterns

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (PixiJS v8 ticker API stable; no fast-moving dependencies)
