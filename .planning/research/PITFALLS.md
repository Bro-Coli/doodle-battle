# Pitfalls Research

**Domain:** Browser-based 2D game with AI integration
**Project:** Crayon World
**Researched:** 2026-04-07
**Confidence:** HIGH (codebase reviewed directly; patterns verified against PixiJS v8 docs and Anthropic API docs)

---

## v1.0 Pitfalls (already addressed)

These were identified before v1.0 and are resolved in the current codebase.

| # | Pitfall | Status |
|---|---------|--------|
| 1 | Canvas export blocks main thread | Addressed |
| 2 | AI latency perceived as broken | Addressed — loading overlay exists |
| 3 | API key exposed in browser bundle | Addressed — server proxy in place |
| 4 | Frame-rate-coupled simulation | Addressed — dt-based ticker |
| 5 | PixiJS texture/memory leaks on spawn | Addressed — textures reused per entity |
| 6 | CORS failures between client and server | Addressed — Vite proxy + cors middleware |
| 7 | No dev mock mode | Addressed — MOCK_AI=true |
| 8 | Overscoping entity behavior | Addressed — pure functions, <50 lines each |
| 9 | Drawing canvas feel | Addressed — neighbor-averaging smoothing |
| 10 | Mid-stroke recognition | Addressed — explicit Submit button |
| 11 | Entity spawns on top of drawing | Addressed — separate draw/world views |
| 12 | Scope creep into multiplayer | Ongoing discipline |
| 13 | AI returns inconsistent profile formats | Addressed — validation in server |
| 14 | Not testing with bad drawings | Addressed — graceful fallback |

---

## v1.1 Critical Pitfalls

New features for v1.1: batch AI interaction analysis, round system, chase/flee/fight/symbiosis behaviors, entity removal on defeat.

---

### Pitfall 1: Deleting from `_entityStates` Map During the Game Tick Iteration

**What goes wrong:**
`_gameTick` in `WorldStage.ts` iterates `this._entityStates` with `for...of`. If fight resolution removes an entity mid-tick (calling `_removeEntity` from inside the loop or via a behavior side-effect), the Map iterator is invalidated. Entries added during iteration (spreading copies) are visited; entries deleted may be visited with stale state or skipped inconsistently. This causes runtime crashes or invisible "ghost" entities stuck in the simulation maps but removed from the stage.

**Why it happens:**
The pattern of "detect collision → remove loser immediately" is intuitive but JavaScript's `Map.prototype.forEach` and `for...of` allow deletions during iteration without throwing — the deletion just silently affects iteration. Developers assume it works because it doesn't crash loudly.

**How to avoid:**
Collect all removals into a `pending removal` set during the tick. After the loop completes, call `_removeEntity` for each queued container. Pattern:
```typescript
const toRemove: Container[] = [];
for (const [container, state] of this._entityStates) {
  const newState = dispatchBehavior(state, dt, world);
  if (newState.pendingDeath) toRemove.push(container);
  this._entityStates.set(container, newState);
}
for (const container of toRemove) this._removeEntity(container);
```

**Warning signs:**
- Entities disappear mid-fight then reappear
- `_entityStates.size` does not match visible entity count
- Spreading entities stop spawning copies after a fight occurs nearby

**Phase to address:** Interaction behaviors phase, before any entity removal logic is written.

---

### Pitfall 2: Batch Interaction Prompt Fails Silently on Combinatorial Explosion

**What goes wrong:**
The batch Haiku call analyzes relationships between all entities. With N entities, there are N*(N-1)/2 unique pairs. At 10 entities that's 45 pairs; at 20 entities it's 190 pairs. The prompt grows large, Haiku's response parsing gets fragile, and the token cost spikes. Worse: if the prompt exceeds context or Haiku returns partial JSON, the entire interaction graph fails — all entities fall back to "ignore" and the round feels broken.

**Why it happens:**
The prompt is designed when there are 3-5 test entities. It works fine. Scaling is not considered until a demo day where someone draws 15 entities.

**How to avoid:**
- Cap entities per round at 8-10 in the prompt. If more exist, sample the most recently spawned.
- Ask Haiku to return a flat array of `{a, b, relationship}` triples rather than a full NxN matrix — partial arrays are still usable.
- Validate the response: if fewer than 50% of expected pairs are present, treat missing pairs as "ignore" rather than failing.
- In mock mode, generate mock interaction matrices automatically from the mock entity list so this path is tested.

**Warning signs:**
- Interaction analysis always returns "ignore" for most pairs in large sessions
- Server 500 errors or timeouts during round start with many entities
- Token usage logs show spikes when entity count exceeds 8

**Phase to address:** Batch AI analysis phase — design the prompt format with combinatorial growth in mind from the start.

---

### Pitfall 3: Interaction State Lives in Behavior Functions but Targets Must Come from WorldStage

**What goes wrong:**
The existing behavior architecture is pure: `(state, dt, world) => state`. Interaction behaviors (chase, flee, fight) require knowing where other entities are — a `targets` list. The temptation is to pass target positions inside `world` or inside the individual entity state. If targets are embedded in state, they become stale immediately (other entities moved). If they are computed inside the behavior function, there's no access to the full entity map.

**Why it happens:**
Pure behavior functions work perfectly for isolated archetypes. Developers try to extend this pattern to interactions without changing the function signature, resulting in stale or missing target data.

**How to avoid:**
Extend the `world` parameter — already passed to every behavior — to include a `neighbors` snapshot taken before the tick loop begins:
```typescript
interface WorldContext {
  width: number;
  height: number;
  neighbors?: Array<{ id: string; x: number; y: number; archetype: Archetype }>;
}
```
Snapshot positions at the start of each tick. Behavior functions read from the snapshot, never from live state. This preserves purity (the snapshot is immutable for the duration of the tick) and keeps functions testable.

**Warning signs:**
- Chase behavior targets stale positions (entities chase where prey was 5 frames ago but never converges)
- Behavior tests require mocking PixiJS containers to test chase logic
- Circular imports between EntitySimulation and WorldStage

**Phase to address:** Interaction behaviors phase — define the extended WorldContext type in shared/src/types before writing any interaction behavior.

---

### Pitfall 4: Entity Removal Leaks PixiJS Display Objects and JavaScript Map Entries

**What goes wrong:**
When a defeated entity is removed, five separate maps in `WorldStage` must be cleaned up: `_entityStates`, `_entityTextures`, `_entityProfiles`, `_entityLabels`, `_entitySpriteHeights`. If any one of these is missed, the entity continues to participate in the wrong subsystem — the label drifts on screen, the texture is never GC'd, or the ghost state is iterated in the tick loop. PixiJS v8 additionally requires explicit `destroy()` calls on containers; `removeChild` alone does not free GPU resources.

**Why it happens:**
The five maps are added one-by-one as features are built. At removal time, developers call `removeChild` (which they see working visually) and forget the remaining map entries. No TypeScript error is raised — the maps just hold dead references.

**How to avoid:**
Write a single `_removeEntity(container: Container)` method in WorldStage that is the only legal removal path:
```typescript
private _removeEntity(container: Container): void {
  const label = this._entityLabels.get(container);
  if (label) { this._worldRoot.removeChild(label); label.destroy({ children: true }); }
  this._worldRoot.removeChild(container);
  container.destroy({ children: true }); // frees GPU resources
  this._entityStates.delete(container);
  this._entityTextures.delete(container);
  this._entityProfiles.delete(container);
  this._entityLabels.delete(container);
  this._entitySpriteHeights.delete(container);
}
```
Call only this method. Never call `removeChild` directly on entity containers elsewhere.

**Warning signs:**
- Label containers remain visible after entity is defeated
- Memory grows after many rounds (verify with DevTools Memory tab)
- `_entityStates.size` is larger than the visible entity count
- PixiJS console warnings about destroyed containers

**Phase to address:** Entity removal phase — write `_removeEntity` as the first thing before implementing any defeat logic.

---

### Pitfall 5: Round State Machine Implemented as Ad-Hoc Boolean Flags

**What goes wrong:**
The round system has at minimum four states: `idle` (drawing phase), `analyzing` (Haiku batch call in flight), `simulating` (entities interacting, timer counting down), `resolving` (defeats being applied, survivors persisting). Without an explicit state machine, this is typically implemented as `isAnalyzing: boolean`, `isSimulating: boolean`, `roundTimer: number` scattered across the component. Race conditions emerge: the user clicks "Start Round" twice, the analyze call fires twice, or the round timer keeps running after a fight kills all entities.

**Why it happens:**
State flags are the path of least resistance. Each flag looks harmless alone. The race conditions only appear with fast clicking or edge cases.

**How to avoid:**
Use a single `roundPhase` string enum: `'idle' | 'analyzing' | 'simulating' | 'done'`. Gate all UI actions and logic transitions on this value. Transitions are explicit:
- `idle → analyzing`: user clicks Start Round, disable button immediately
- `analyzing → simulating`: Haiku response received and parsed
- `simulating → done`: timer expires or all hostile entities have resolved
- `done → idle`: user clicks Next Round, clear defeated entities, keep survivors

**Warning signs:**
- Duplicate API calls in the network tab when Start Round is clicked quickly
- Round timer does not stop when all entities are gone
- Fight results applied after round is already in `done` state

**Phase to address:** Round system phase — define the `RoundPhase` type before writing any round UI or timer logic.

---

### Pitfall 6: Fade-Out Animation Runs While Entity Is Still in Simulation

**What goes wrong:**
When an entity is defeated, the natural UX is a fade-out before removal. If the entity's `_entityStates` entry is not suspended during the fade, it continues to move, collide, and potentially trigger further fight resolution while visually disappearing. A dying wolf continues chasing sheep for 500ms. This produces confusing ghost behavior.

**Why it happens:**
The fade is implemented as a visual effect (alpha tween on the container) without a corresponding "dying" state in simulation. The tick loop has no knowledge of the visual fade.

**How to avoid:**
Add a `dying` flag to entity state. When `dying === true`, `dispatchBehavior` returns the state unchanged (entity freezes in place). The tick loop skips fight resolution checks for dying entities. After the fade duration elapses, the pending-removal queue collects the container. This keeps visual and simulation state synchronized:
```typescript
if (state.dying) {
  // Still apply to container alpha via a separate dying map
  return state; // no movement, no interaction
}
```

**Warning signs:**
- Defeated entities still trigger fight callbacks during fade
- Entities "teleport" at the end of a fade (last tick moved them before removal)
- Fight resolution fires for entities with alpha < 0.1

**Phase to address:** Entity removal phase — define the `dying` state extension before writing the fade animation.

---

### Pitfall 7: Interaction Relationships Not Persisted Across the Simulation

**What goes wrong:**
The Haiku interaction analysis runs once at round start and produces a relationship map (wolf chases sheep, tree ignores wolf, etc.). If this map is stored only in a local variable in the round-start handler, it is garbage-collected or reset when the handler returns. During the simulation tick, behaviors need to look up "who does entity A chase?" but the relationship map is gone. Entities default to idle movement.

**Why it happens:**
The batch call response is handled inline: parse JSON → start timer → start simulation. The relationship map is never stored anywhere persistent. Works fine in the handler but is unreachable from the game tick.

**How to avoid:**
Store the interaction graph in `WorldStage` as a class-level map, keyed by entity container (or by entity name string):
```typescript
private readonly _interactions = new Map<Container, InteractionTarget>();
// { type: 'chase' | 'flee' | 'fight' | 'symbiosis' | 'ignore', targetContainer: Container }
```
Populate it from the Haiku response in `startRound()`. Read it in `_gameTick` when building the `neighbors` context. Clear it in `endRound()`.

**Warning signs:**
- Entities move randomly during simulation despite a valid Haiku response
- `console.log` of interaction map inside tick is always empty
- Chase/flee behavior only works for one frame then reverts

**Phase to address:** Batch AI analysis phase — the storage structure must exist before the Haiku call is written.

---

### Pitfall 8: Batch Haiku Prompt Returns Entity Names That Don't Match Current Entities

**What goes wrong:**
The batch interaction prompt lists entity names ("wolf", "sheep", "oak tree"). Haiku responds with relationships keyed by those names. If the player drew the same entity twice (two wolves), or if Haiku slightly changes the name in its response ("Oak Tree" vs "oak tree"), the response-to-container mapping fails silently. Both wolves get ignored; the relationship table has orphaned entries.

**Why it happens:**
The prompt uses human-readable names as keys. Haiku may normalize casing, pluralize, or reword. Multiple entities with the same name have no disambiguation.

**How to avoid:**
- Assign each entity a stable UUID at spawn time and include it in the batch prompt: `"entity_id: 'e1', name: 'wolf'"`.
- Request Haiku to key its response by `entity_id`, not name.
- Alternatively, use zero-indexed integers: `"entity 0 (wolf) and entity 1 (sheep)"` → response uses `0` and `1`.
- Normalize entity names to lowercase-trimmed before comparison as a fallback.

**Warning signs:**
- Two entities with the same name always "ignore" each other
- Interaction matrix is empty after parsing despite a valid Haiku response
- Name matching works in mock mode but fails with real AI because casing differs

**Phase to address:** Batch AI analysis phase — design the ID scheme before writing the prompt template.

---

### Pitfall 9: Survivors "Accumulate" Across Rounds Until Performance Degrades

**What goes wrong:**
Survivors persist across rounds — this is a feature. But without a cap, over many rounds dozens of entities accumulate. Each entity is iterated every tick. With 50+ entities all running interaction checks against each other, the O(N²) neighbor scan per tick exceeds 60fps budget. The game slows to a crawl by round 5.

**Why it happens:**
The accumulation is intentional as a feature but the performance ceiling is not considered. It manifests gradually — works fine in testing (few rounds, few entities), fails at demo with engaged users.

**How to avoid:**
- Cap total entities at a hard limit (16-20 for PoC). When spawning would exceed the cap, reject with a "world is full" message.
- Only run interaction checks when `roundPhase === 'simulating'`. During idle/analyzing phases, entities revert to baseline archetype movement (O(N), not O(N²)).
- The neighbor scan is only needed for entities with an active interaction target. Stationary/rooted entities with no interaction skip the scan.

**Warning signs:**
- Frame rate drops noticeably after round 3+
- `_entityStates.size` grows monotonically each round
- Performance profiler shows `_gameTick` consuming >10ms per frame

**Phase to address:** Round system phase — set the entity cap and conditional interaction logic before testing multi-round gameplay.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store interactions as `Map<string, string>` keyed by name instead of container | Simple to implement | Breaks on duplicate names; coupling to AI output casing | Never — use IDs |
| Run interaction checks every tick unconditionally | Simple loop | O(N²) cost even when no simulation is active | Never in production |
| Remove entities with `removeChild` only (no `destroy`) | One line | GPU texture leak; stale Map entries cause ghost behavior | Never |
| Inline round state as booleans | Fast to write | Race conditions on double-click; untestable | Never |
| Skip `dying` state, just remove entity immediately on defeat | Simpler removal logic | No fade-out UX; jarring visual; fight logic fires during fade | Acceptable in early prototype only |
| Parse Haiku interaction JSON without validation | Less code | Silent failures when Haiku changes format or returns partial data | Never — always validate |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Haiku batch call | Pass full entity profile array; Haiku may summarize/paraphrase names back | Pass only `id` + `name`; use IDs (not names) to match response to containers |
| Haiku batch call | Treat non-200 response as fatal; abort round | Treat as "all pairs ignore"; log error; allow round to proceed with no interactions |
| Haiku batch call | Ask for full N×N matrix in response | Ask for sparse list of non-ignore pairs only; missing pairs default to ignore |
| PixiJS container destroy | Call `container.destroy()` with no options | Call `container.destroy({ children: true })` to cascade to all child sprites |
| PixiJS container destroy | Destroy container while it is still a child of worldRoot | Call `removeChild` first, then `destroy` — or use the `_removeEntity` helper |
| Round timer | Use `setInterval` for countdown | Use PixiJS ticker delta accumulation — stays sync with simulation, pauses if tab is hidden |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| O(N²) neighbor scan every tick | Frame drops after round 3 | Only scan during `simulating` phase; skip entities with `ignore` relationship | ~15+ entities |
| Spreading copies never removed | Entity count grows unbounded | Spreading copies count toward entity cap; remove oldest copy when cap exceeded | ~20 entities on screen |
| Creating new `Container` / `Sprite` per tick for visual effects (flash, glow) | Memory spike during fights | Pool effect objects; reuse alpha/tint on existing containers | Every fight with 5+ entities |
| Haiku call with full drawing image for interaction analysis | High token cost per round | Interaction analysis is text-only (entity names/roles); no image needed after spawn | Every round |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback during interaction analysis (0.5-2s Haiku call) | User clicks Start Round, nothing happens, clicks again | Disable button immediately; show "Analyzing relationships..." overlay |
| Entities instantly vanish on defeat | Visually jarring; user can't tell what happened | Fade out over 400-600ms; show brief "defeated" label or X mark |
| Round ends abruptly with no summary | User doesn't know who won | Brief "Round complete" panel listing survivors before returning to draw mode |
| Survivors retain hostile state into draw phase | Entities chase each other while player is trying to draw | On round end, revert all entities to baseline archetype movement (no interactions) |
| Entity cap hit silently | Player draws 12th entity, nothing happens, no explanation | Show "World is full (10/10)" indicator; suggest starting a round to clear space |

---

## "Looks Done But Isn't" Checklist

- [ ] **Entity removal:** All five `WorldStage` maps cleaned up, not just `removeChild` — verify `_entityStates.size` matches visible entity count after removal
- [ ] **Fade-out:** Entity freezes in simulation during fade — verify dying entity does not move or trigger fight callbacks during fade duration
- [ ] **Round state machine:** Double-clicking "Start Round" does not fire two Haiku calls — verify `roundPhase` gates the call
- [ ] **Interaction persistence:** Relationship map is accessible inside `_gameTick`, not only inside the round-start handler — verify by logging inside the tick
- [ ] **Survivor persistence:** After round end, surviving entities retain their profiles and states, not reset to initial positions — verify by logging x/y before and after round transition
- [ ] **Batch prompt ID scheme:** Entity IDs in the Haiku response map correctly to containers even when two entities have the same name — verify with two "wolf" entities in mock mode
- [ ] **Mock interaction mode:** `MOCK_AI=true` returns a mock interaction matrix (not just mock profiles) so the entire round flow is testable without API calls

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Map mutation during tick | MEDIUM | Add `toRemove` queue; refactor `_gameTick` to defer removals; ~1hr |
| Missing `_removeEntity` helper | MEDIUM | Write helper, audit all existing `removeChild` calls, fix map leaks; ~2hr |
| Round state as booleans | HIGH | Refactor to `RoundPhase` enum, update all conditionals; risk of regressions; ~half day |
| Interaction map not persisted | LOW | Move map to class field; ~30min fix once identified |
| Entity cap missing | LOW | Add cap check in `spawnEntity`; ~30min |
| Duplicate entity name matching | MEDIUM | Retrofit ID scheme into prompt + response parsing; ~2hr |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Map mutation during tick (#1) | Interaction behaviors — first PR | `_entityStates.size` matches visible count after fight |
| Batch prompt combinatorial explosion (#2) | Batch AI analysis | Prompt token count logged; test with 10 entities |
| Stale targets in behavior functions (#3) | Interaction behaviors | Behavior unit tests accept WorldContext with neighbors snapshot |
| Entity removal map leak (#4) | Entity removal — write `_removeEntity` first | DevTools memory stable across 10 rounds |
| Ad-hoc round state flags (#5) | Round system — define `RoundPhase` type first | No duplicate Haiku calls on rapid Start clicks |
| Fade-out ghost behavior (#6) | Entity removal | Dying entity does not move or fight during fade |
| Interaction map not persisted (#7) | Batch AI analysis — storage before prompt | Interaction map accessible in tick during simulation |
| Name vs ID mismatch (#8) | Batch AI analysis — design prompt format first | Two entities with same name interact correctly |
| Survivor accumulation perf (#9) | Round system — add entity cap | 60fps maintained after 5 rounds with max entities |

---

## Sources

- PixiJS v8 Garbage Collection guide: https://pixijs.com/8.x/guides/concepts/garbage-collection
- PixiJS GitHub issue — memory leak when rendering to RenderTexture (May 2025): https://github.com/pixijs/pixijs/issues/11409
- PixiJS GitHub issue — destroying parent should remove children from render layers (Apr 2025): https://github.com/pixijs/pixijs/issues/11373
- MDN — Map.prototype.forEach iteration behavior during mutation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
- Anthropic API pricing and rate limits: https://platform.claude.com/docs/en/about-claude/pricing
- Codebase review: WorldStage.ts, EntitySimulation.ts, behaviors/\*, shared/src/types.ts (direct inspection)

---

*Pitfalls research: v1.1 Entity Interactions & Rounds*
*Researched: 2026-04-07*
