# Phase 7: Round State Machine & Entity Removal - Research

**Researched:** 2026-04-07
**Domain:** PixiJS v8 resource lifecycle, finite state machines, async round orchestration, DOM overlay patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- RoundPhase enum: `idle` → `analyzing` → `simulating` → `done` (not booleans)
- "Start Round" button in the toolbar — next to Submit/Clear/Undo, disabled until entities exist in the world
- Pressing Start Round auto-switches to world view immediately
- During analyzing: world view visible with entities frozen, spinner overlay indicates loading
- All toolbar buttons disabled during a round (analyzing + simulating phases)
- Defeated entities fade out over ~0.5 seconds (alpha 1→0), matching existing fade-in pattern
- Label fades with the entity in sync
- Entities removed instantly on fight contact, not deferred to round end
- After fade completes: full cleanup of all 5 WorldStage maps + label sibling container + GPU texture via `container.destroy({children: true})`
- Entities in "dying" state stop moving and are excluded from all interaction resolution
- Fixed 30-second rounds, no early end
- Visible countdown timer on screen during simulation
- When round ends: auto-switch back to draw mode
- Entities freeze between rounds (no archetype movement in idle state)
- Draw/World toggle still works between rounds

### Claude's Discretion

- Countdown timer placement and styling
- Spinner overlay design during analyzing phase
- Exact proximity threshold for fight contact (research suggests ~30px)
- How `_removeEntity()` handles the fade animation before final cleanup
- "Start Round" button styling and disabled state
- How RoundPhase transitions integrate with the existing toolbar enable/disable pattern

### Deferred Ideas (OUT OF SCOPE)

- Round summary overlay (who survived/removed at round end)
- Early round end button
- Variable round duration
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROUND-01 | Player can press "Start Round" to begin a round after drawing entities | DOM button pattern from main.ts; WorldStage.startRound() method; entity count guard |
| ROUND-02 | Round runs for a timed duration (~30 seconds) then ends automatically | setTimeout-based timer in startRound; phase transition to `done`; auto-switch back to draw mode |
| ROUND-03 | Surviving entities persist into the next round — world accumulates | Entities not marked dying remain in all 5 maps; no full-world clear on round end; idle phase freezes movement |
| REMV-01 | Defeated entities fade out and are fully removed (container, state, label, texture references) | Fade-out mirrors existing fade-in ticker pattern; `container.destroy({children: true})` releases GPU; all 5 map deletes |
| REMV-02 | Entities in "dying" state do not participate in further interactions | `dying` flag on EntityState union variant or wrapper; `_gameTick` skips dying entities for behavior dispatch |
</phase_requirements>

---

## Summary

Phase 7 is pure infrastructure wiring on top of already-complete subsystems. The codebase already has the exact patterns needed: `app.ticker.add(fn)` for animation (fade-in in EntitySprite.ts), `container.destroy({children: true})` is the PixiJS v8 canonical GPU-release call, and the existing `disableAllToolbar`/`enableAllToolbar` closure in main.ts handles button gating. No new third-party libraries are required.

The central design question is where to place the `dying` flag. The cleanest approach is a wrapper object stored in `_entityStates` rather than extending every per-archetype state type. This preserves the existing `EntityState` discriminated union and keeps `dispatchBehavior` untouched — the tick loop checks for dying and skips the dispatch entirely.

The round timer is a straightforward `setTimeout(() => endRound(), 30_000)` stored on `WorldStage`. The countdown display is a DOM element updated from a `setInterval` running in parallel — not from the PixiJS ticker — so it does not affect simulation delta-time.

**Primary recommendation:** Add `RoundPhase` enum and `_roundPhase` field to `WorldStage`, implement `startRound()`/`_endRound()` methods that call the existing `/api/interactions` route, add a dying-wrapper map (`_entityDying: Set<Container>`), and wire a new "Start Round" DOM button in `main.ts` using the established toolbar closure pattern.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | v8 (workspace) | Entity container/texture lifecycle | Already in use; `destroy({children: true})` is the documented GPU release path |
| TypeScript | 5.x (workspace) | RoundPhase string enum, type narrowing | Already strict mode throughout |
| HTML/CSS DOM | browser | Countdown timer, spinner, Start Round button | Established project pattern — no new deps |

### No New Dependencies

This phase requires zero new npm packages. Every mechanism (ticker animation, DOM overlays, fetch calls, disableAllToolbar pattern) already exists in the codebase and just needs new entry points wired together.

---

## Architecture Patterns

### RoundPhase Enum

```typescript
// Source: CONTEXT.md locked decision — string enum prevents accidental numeric comparison
export type RoundPhase = 'idle' | 'analyzing' | 'simulating' | 'done';
```

Place this in `client/src/world/WorldStage.ts` (or a co-located `RoundPhase.ts` if preferred). It is only consumed by the client; the server is stateless per-request.

### Dying-Wrapper Pattern (Don't extend EntityState)

```typescript
// WorldStage internal — not on EntityState union
private readonly _dyingEntities = new Set<Container>();

// Check before dispatching behavior in _gameTick
for (const [container, state] of this._entityStates) {
  if (this._dyingEntities.has(container)) continue; // REMV-02: dying = frozen
  const newState = dispatchBehavior(state, dt, world);
  // ... rest of tick
}
```

Rationale: Adding a `dying` boolean to every archetype state type would require touching all 6 state interfaces and the discriminated union. A `Set<Container>` on WorldStage is O(1) lookup and zero refactor cost.

### Recommended Project Structure Changes

```
client/src/world/
├── WorldStage.ts         # Add: RoundPhase field, startRound(), _endRound(), _removeEntity()
├── EntitySprite.ts       # Unchanged — fade-in pattern is reference implementation
├── EntitySimulation.ts   # Unchanged — dispatchBehavior stays pure
└── RoundOverlay.ts       # NEW: countdown timer + analyzing spinner DOM elements
```

`main.ts` changes:
- Add `startRoundBtn` DOM button (disabled until entities exist)
- Wire click → `worldStage.startRound(profiles)`
- WorldStage emits phase changes back via callbacks or the button state is managed inside `startRound`

### Pattern 1: startRound() Method

```typescript
// WorldStage.ts — skeleton
async startRound(profiles: EntityProfile[]): Promise<void> {
  if (this._roundPhase !== 'idle') return; // guard double-click
  this._roundPhase = 'analyzing';
  // caller (main.ts) has already disabled toolbar + switched to world view

  // 1. Show analyzing spinner
  this._roundOverlay.showAnalyzingSpinner();

  // 2. Fetch interaction matrix
  const matrix = await fetchInteractions(profiles);

  // 3. Store matrix for Phase 8 consumption (expose getter or event)
  this._interactionMatrix = matrix;

  // 4. Hide spinner, start simulation
  this._roundOverlay.hideAnalyzingSpinner();
  this._roundPhase = 'simulating';
  this._roundOverlay.startCountdown(30);

  // 5. Auto-end after 30 seconds
  this._roundTimer = window.setTimeout(() => this._endRound(), 30_000);
}
```

### Pattern 2: _removeEntity() — Single Legal Removal Path

```typescript
// WorldStage.ts
_removeEntity(container: Container): void {
  if (this._dyingEntities.has(container)) return; // idempotent
  this._dyingEntities.add(container);

  const label = this._entityLabels.get(container);
  let elapsed = 0;
  const fadeDuration = 500; // ms — locked decision

  const fadeOut = (ticker: Ticker): void => {
    elapsed += ticker.deltaMS;
    const alpha = Math.max(0, 1 - elapsed / fadeDuration);
    container.alpha = alpha;
    if (label) label.alpha = alpha;

    if (alpha <= 0) {
      this._app.ticker.remove(fadeOut);
      // Full cleanup after fade
      this._entityStates.delete(container);
      this._entityTextures.delete(container);
      this._entityProfiles.delete(container);
      this._entityLabels.delete(container);
      this._entitySpriteHeights.delete(container);
      this._dyingEntities.delete(container);
      label?.destroy({ children: true });
      container.destroy({ children: true }); // releases GPU texture ref
    }
  };

  this._app.ticker.add(fadeOut);
}
```

**Why `destroy({children: true})`:** PixiJS v8 `Container.destroy()` without the option only removes the container from its parent's display list; it does not free the underlying `Texture` GPU memory. Passing `{children: true}` recursively destroys all child `Sprite` objects including their texture references. The `Texture` itself is only actually freed when all references are released — which this handles since the texture was also referenced in `_entityTextures` (deleted above).

### Pattern 3: Countdown Timer via setInterval (not PixiJS ticker)

```typescript
// RoundOverlay.ts
startCountdown(seconds: number, onTick?: (remaining: number) => void): void {
  this._remaining = seconds;
  this._updateDisplay();
  this._intervalId = window.setInterval(() => {
    this._remaining -= 1;
    this._updateDisplay();
    onTick?.(this._remaining);
    if (this._remaining <= 0) this.stopCountdown();
  }, 1000);
}
```

Do NOT drive the countdown from `app.ticker` — the ticker fires at 60fps with floating-point deltaMS, making clean 1-second decrements fragile. `setInterval(fn, 1000)` is the correct tool for wall-clock display.

### Pattern 4: fetchInteractions() Client Helper

```typescript
// client/src/world/fetchInteractions.ts (new file)
export async function fetchInteractions(profiles: EntityProfile[]): Promise<InteractionMatrix> {
  const res = await fetch('/api/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entities: profiles }),
  });
  if (!res.ok) throw new Error(`Interactions API ${res.status}`);
  return res.json() as Promise<InteractionMatrix>;
}
```

### Anti-Patterns to Avoid

- **Boolean flags for round state** — `isAnalyzing`, `isSimulating` booleans allow illegal combinations and race conditions. The `RoundPhase` enum prevents this structurally.
- **Deleting from `_entityStates` while iterating it** — The `_gameTick` loop iterates `_entityStates`. Deletion during iteration in a `Map` forEach is legal in JS (entries added during iteration are unvisited, entries deleted are skipped), but it is cleaner and safer to queue deletions and process them after the tick loop. However, since `_removeEntity` defers actual deletion to after the fade animation completes via ticker, this is not actually an issue — the entity is just skipped via the `_dyingEntities` check.
- **Calling `container.destroy()` and keeping map entries** — Accessing a destroyed container's properties throws errors. Always delete all 5 maps before or immediately after `destroy()`.
- **Fading entity texture vs entity container alpha** — Set `alpha` on the `Container`, not on the inner `Sprite` or `Texture`. Label alpha must match because label is a sibling container, not a child.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPU texture release | Custom ref-counting system | `container.destroy({children: true})` | PixiJS v8 manages texture cache internally |
| Countdown display | PixiJS ticker-based counter | `setInterval` + DOM element | Ticker is variable-rate; `setInterval` is wall-clock |
| Async round gate | Promise chains with flags | Single `RoundPhase` enum guard at method entry | Enum prevents re-entrancy; booleans allow race |
| Fade animation | CSS transitions on canvas | `app.ticker.add(fadeOut)` | Canvas elements don't respond to CSS transitions; ticker matches existing fade-in pattern exactly |

---

## Common Pitfalls

### Pitfall 1: Texture not freed after destroy()

**What goes wrong:** `container.destroy({ children: true })` is called but the `Texture` object is still referenced in `_entityTextures` map → GPU memory never released.
**Why it happens:** PixiJS textures are ref-counted. Even after the Sprite is destroyed, the Texture object in the map holds a reference.
**How to avoid:** Delete from `_entityTextures` BEFORE calling `container.destroy()`. Deletion order: maps first, then `label.destroy()`, then `container.destroy()`.
**Warning signs:** Memory usage climbs monotonically during a session with many entity spawns and removals.

### Pitfall 2: Double-invoking startRound()

**What goes wrong:** Player clicks "Start Round" twice quickly → two API calls in flight → two timers → chaotic state.
**Why it happens:** The button may not be visually disabled before the async call returns.
**How to avoid:** First line of `startRound()` checks `if (this._roundPhase !== 'idle') return;` and immediately sets `this._roundPhase = 'analyzing'`. The caller also sets `startRoundBtn.disabled = true` synchronously before awaiting.

### Pitfall 3: _gameTick iterates dying entities

**What goes wrong:** An entity is marked dying but `dispatchBehavior` still runs on it, moving the container position. The container is fading out but still visually skittering across the screen.
**Why it happens:** `_dyingEntities` check missing or placed after dispatch.
**How to avoid:** `_dyingEntities.has(container)` check is the FIRST statement inside the tick loop body, before `dispatchBehavior`.

### Pitfall 4: Label not cleaned up

**What goes wrong:** `container.destroy()` is called but label (a sibling container in `_worldRoot`, not a child of entity) is orphaned and left visible.
**Why it happens:** Label is a sibling, not a child — `container.destroy({children: true})` does NOT destroy it.
**How to avoid:** `_removeEntity` explicitly calls `label?.destroy({ children: true })` as a separate step after deleting from `_entityLabels`.

### Pitfall 5: clearTimeout not called on phase abort

**What goes wrong:** If `startRound()` is called again before the previous timer fires (shouldn't be possible with the guard, but defensive), or if the game is torn down mid-round, the 30-second `setTimeout` fires and transitions phase to `done` unexpectedly.
**How to avoid:** Store `this._roundTimer: number | null`. In `_endRound()`, `clearTimeout(this._roundTimer)` before nulling it. Also clear in any future cleanup/reset path.

### Pitfall 6: Freezing movement in idle between rounds

**What goes wrong:** Between rounds (`idle` phase), entities continue moving per their archetype because `_gameTick` still runs.
**Why it happens:** The ticker is registered once in the constructor and never removed.
**How to avoid:** In `_gameTick`, check `if (this._roundPhase !== 'simulating') return;` at the top. In idle and done phases, the tick loop returns immediately — entities are frozen without removing the ticker (removing/re-adding ticker is more complex and fragile).

---

## Code Examples

### Existing Fade-In (Reference Implementation for Fade-Out)

```typescript
// Source: client/src/world/EntitySprite.ts lines 87-96
const fadeIn = (ticker: Ticker): void => {
  elapsed += ticker.deltaMS;
  const alpha = Math.min(1, elapsed / 300);
  entity.alpha = alpha;
  label.alpha = alpha;
  if (alpha >= 1) {
    app.ticker.remove(fadeIn);
  }
};
app.ticker.add(fadeIn);
```

The fade-out pattern is the exact mirror: `Math.max(0, 1 - elapsed / 500)`, remove ticker when alpha reaches 0, then call cleanup.

### PixiJS v8 destroy() — confirmed signature

```typescript
// PixiJS v8 Container.destroy(options?)
// options.children: boolean — if true, recursively destroys all children
container.destroy({ children: true });
// This destroys child Sprites and releases their texture references.
// The Texture GPU resource is freed when all referencing Sprites are destroyed
// AND no other references remain (e.g., _entityTextures map).
```

### Existing toolbar disable pattern

```typescript
// Source: client/src/main.ts lines 92-106
const disableAllToolbar = (): void => {
  submitBtn.disabled = true;
  clearBtn.disabled = true;
  undoBtn.disabled = true;
  for (const preset of thicknessPresets) {
    thicknessButtons[preset].disabled = true;
  }
};
const enableAllToolbar = (): void => {
  for (const preset of thicknessPresets) {
    thicknessButtons[preset].disabled = false;
  }
  syncButtonState(); // restore correct state for action buttons
};
```

`startRoundBtn` needs to be added to both closures. During a round, it should stay disabled. After round ends, it should be re-enabled only if `_entityStates.size > 0`.

### Entity count guard for Start Round button

```typescript
// main.ts — keep startRoundBtn in sync
const syncStartRoundBtn = (): void => {
  startRoundBtn.disabled =
    worldStage.entityCount === 0 || worldStage.roundPhase !== 'idle';
};
```

`WorldStage` needs a `get entityCount()` getter returning `this._entityStates.size` and a `get roundPhase()` returning `this._roundPhase`.

---

## Integration Map

| What changes | Where | What it calls |
|---|---|---|
| `RoundPhase` type | WorldStage.ts | consumed by getter + guards |
| `_roundPhase` field | WorldStage.ts | read in `_gameTick` freeze check |
| `_dyingEntities` Set | WorldStage.ts | checked in `_gameTick`, populated by `_removeEntity` |
| `_interactionMatrix` field | WorldStage.ts | populated by `startRound()`, consumed by Phase 8 |
| `startRound(profiles)` | WorldStage.ts | calls `fetchInteractions()`, transitions phases, starts timer |
| `_endRound()` | WorldStage.ts | sets phase to `done`, stops countdown, auto-switches to draw |
| `_removeEntity(container)` | WorldStage.ts | fade-out ticker, then destroy+map-delete |
| `entityCount` getter | WorldStage.ts | used by main.ts to gate Start Round button |
| `roundPhase` getter | WorldStage.ts | used by main.ts to gate Start Round button |
| `fetchInteractions()` | new client/src/world/fetchInteractions.ts | POST /api/interactions |
| `RoundOverlay` | new client/src/world/RoundOverlay.ts | spinner + countdown DOM elements |
| `startRoundBtn` | main.ts | wires click → worldStage.startRound(), added to disableAllToolbar/enableAllToolbar |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| PixiJS v7 `app.destroy()` removes ticker | PixiJS v8 ticker persists until explicitly removed | Don't call `app.ticker.remove(fn)` unless you added `fn` — the shared `_gameTick` stays registered forever |
| Boolean flags for game state | Enum/discriminated union | Phase 7 uses string enum `RoundPhase` |
| Direct container property access post-destroy | Guard with `_dyingEntities` check before dispatch | Prevents null-deref on destroyed container |

---

## Open Questions

1. **Where does Phase 8 consume `_interactionMatrix`?**
   - What we know: Phase 7 stores the matrix, Phase 8 uses it to add steering behaviors.
   - What's unclear: The exact API surface — getter on WorldStage vs event emitter vs constructor injection.
   - Recommendation: Expose a `get interactionMatrix()` getter returning `InteractionMatrix | null`. Phase 8 can read it from the same WorldStage reference. Keep it simple.

2. **viewToggle button state during a round**
   - What we know: Context says draw/world toggle still works between rounds. Context also says toolbar is fully disabled during analyzing/simulating.
   - What's unclear: Does "all toolbar buttons disabled" include the view toggle during a round?
   - Recommendation: Disable viewToggle during analyzing (spinner must stay visible) but re-enable during simulating so the player can peek at the world. Add to `disableAllToolbar` and restore in a separate post-analyzing step. Or treat viewToggle as always enabled per existing pattern. The safer choice: disable during analyzing only, re-enable when simulating begins.

3. **Error handling when /api/interactions returns 502**
   - What we know: The route already handles retry internally; 502 means both AI attempts failed.
   - What's unclear: Should startRound() catch the error and fall back to an all-ignore matrix, or re-throw and show an error toast?
   - Recommendation: Catch and use the all-ignore matrix (same as server-side fallback behavior) — allows the round to proceed even without AI, which is important for offline/mock demos. Show a brief toast "AI unavailable — proceeding with default behavior."

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (server package) |
| Config file | `server/vitest.config.ts` |
| Quick run command | `pnpm run test` (from repo root) |
| Full suite command | `pnpm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROUND-01 | Start Round button disabled when no entities exist | unit | `pnpm run test -- --reporter=verbose` (behaviors.test.ts) | ❌ Wave 0 |
| ROUND-02 | Round transitions idle→analyzing→simulating→done | unit | same | ❌ Wave 0 |
| ROUND-03 | Surviving entities remain in _entityStates after endRound | unit | same | ❌ Wave 0 |
| REMV-01 | _removeEntity deletes all 5 maps + destroys container | unit | same | ❌ Wave 0 |
| REMV-02 | Dying entities skipped in _gameTick dispatch | unit | same | ❌ Wave 0 |

**Note:** All client-side logic (WorldStage, RoundPhase, _removeEntity) is in `client/src/` but the Vitest config in `server/` already imports from `client/src/` (see `behaviors.test.ts` line 2: `import { wrapPosition } from '../../client/src/world/EntitySimulation'`). New tests for Phase 7 should follow the same pattern — test files go in `server/tests/`, import from `../../client/src/world/WorldStage`.

PixiJS internals (Container, Ticker) cannot be used in a Node.js Vitest environment without mocking. Tests must mock `Application` and `Container` — use `vi.fn()` stubs for `app.ticker.add`, `app.ticker.remove`, and `container.destroy`.

### Sampling Rate

- **Per task commit:** `pnpm run test`
- **Per wave merge:** `pnpm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/tests/roundStateMachine.test.ts` — covers ROUND-01, ROUND-02, ROUND-03, REMV-01, REMV-02
  - Must mock PixiJS: `vi.mock('pixi.js', ...)` with stub `Container`, `Ticker`, `Application`
  - Must mock `fetchInteractions` to avoid real HTTP calls in tests

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `client/src/world/WorldStage.ts`, `EntitySprite.ts`, `main.ts`, `style.css`: all existing patterns documented directly from source
- Direct codebase inspection — `server/tests/behaviors.test.ts`: confirmed Vitest imports from `../../client/src/` are the established pattern
- Direct codebase inspection — `shared/src/types.ts`: `InteractionMatrix`, `EntityRelationship`, `InteractionType` are the exact types Phase 7 must store

### Secondary (MEDIUM confidence)

- PixiJS v8 `Container.destroy({children: true})` behavior: inferred from v8 docs pattern and codebase comment at `EntitySprite.ts` line 62 referencing pixi-filters v6 API signature changes — confirms this project tracks v8-specific APIs carefully

### Tertiary (LOW confidence — not needed, no new deps)

- No third-party library research required for this phase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns are direct codebase reads
- Architecture: HIGH — RoundPhase enum, _dyingEntities Set, and _removeEntity structure derived directly from CONTEXT.md decisions and existing EntitySprite fade-in pattern
- Pitfalls: HIGH — derived from reading the exact code paths that will be modified (5-map deletion order, ticker iteration safety, label-as-sibling cleanup)

**Research date:** 2026-04-07
**Valid until:** 2026-06-01 (stable — no fast-moving dependencies)
