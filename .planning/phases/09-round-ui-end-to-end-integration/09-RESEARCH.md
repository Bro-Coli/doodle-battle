# Phase 9: Round UI & End-to-End Integration - Research

**Researched:** 2026-04-07
**Domain:** DOM overlay patterns, round state machine extension, E2E integration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Round outcome card**
- Shows at round end with: survivors list (entity names still alive), removed list (entity names destroyed during round), round number ("Round 1 Complete")
- Overlays world view — player sees final entity positions behind the card
- Click to dismiss — player clicks card or dismiss button, then auto-switches to draw mode
- Toolbar stays disabled while outcome card is showing — re-enables after dismiss

**Already built (from Phases 7-8)**
- Start Round button in toolbar, disabled until entities exist — DONE
- Spinner overlay during analyzing phase — DONE (RoundOverlay.showAnalyzingSpinner)
- Countdown timer during simulation — DONE (RoundOverlay.startCountdown)
- All toolbar buttons disabled during round — DONE
- Auto-switch to world view on Start Round — DONE
- Auto-switch to draw mode on round end — NEEDS CHANGE: delay until outcome card dismissed
- Double-click protection — DONE (immediate button disable)
- Fixed 30s rounds — DONE

### Claude's Discretion
- Outcome card visual design and positioning
- How to track round number (simple counter on WorldStage)
- How to track which entities were removed during a round (snapshot before vs after)
- CSS styling for outcome card
- Integration approach for delaying the draw-mode switch until card dismiss

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROUND-04 | UI clearly indicates current round phase (drawing, analyzing, simulating, done) | Outcome card adds the "done" phase indicator; existing spinner and countdown cover the other phases. Survivor/removed data comes from snapshotting `_entityProfiles` before round start and diffing after `_endRound()`. |
</phase_requirements>

## Summary

Phase 9 is a small, focused integration phase. The vast majority of round UI was completed in Phases 7 and 8 — the spinner, countdown timer, toolbar gating, double-click protection, and view-switching are all production-ready code. The only genuinely new work is:

1. An outcome card displayed at the end of each round showing survivors, removed entities, and the round number.
2. Changing the existing `onRoundPhaseChange('idle')` handler in `main.ts` to show the outcome card before switching back to draw mode (currently it switches immediately).
3. E2E verification that the full draw → start → analyze → simulate → outcome card → dismiss → draw loop works correctly.

The codebase is highly consistent. `RoundOverlay.ts` already has `showAnalyzingSpinner()` and `startCountdown()` — a third method `showOutcome(data, onDismiss)` follows the exact same create-on-show / remove-on-dismiss pattern. `RecognitionOverlay.showCard()` is the reference implementation for callback-based card dismiss.

**Primary recommendation:** Add `showOutcome()` to `RoundOverlay`, snapshot entity names before round start in `WorldStage`, compute survivors/removed in `_endRound()`, fire the outcome to the overlay, and change `main.ts` to switch to draw mode only inside the dismiss callback.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native DOM API | — | Overlay creation and event wiring | All existing UI is plain DOM; no new library needed |
| TypeScript | ~5.0 | Type safety for outcome data shape | Already enforced project-wide |
| CSS (style.css) | — | Outcome card styling | All overlay styles live in the single style.css |

No new npm dependencies are needed for this phase.

## Architecture Patterns

### Established Overlay Pattern (create-on-show / remove-on-dismiss)
**What:** DOM elements are created imperatively when shown and removed when dismissed. No persistent hidden elements.
**When to use:** Every overlay in this codebase follows this pattern: spinner, countdown badge, result card, error toast.
**Reference implementation:** `RecognitionOverlay.showCard()` — creates div, appends to `document.body`, calls `onDismiss()` callback when clicked.

```typescript
// Pattern from RecognitionOverlay.ts
showCard(profile: EntityProfile, onDismiss: () => void): void {
  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;   // idempotency guard
    dismissed = true;
    if (this.cardEl) { this.cardEl.remove(); this.cardEl = null; }
    onDismiss();
  };
  const card = document.createElement('div');
  card.className = 'result-card';
  // ... populate children ...
  document.body.appendChild(card);
  this.cardEl = card;
  card.addEventListener('click', dismiss);
}
```

### Outcome Data Flow Pattern
**What:** Snapshot entity state at round start; diff against state at round end.
**When to use:** When you need "what changed during a period" without requiring entities to self-report removal.

```typescript
// In WorldStage, before fetchInteractions():
const namesAtRoundStart = new Set(
  Array.from(this._entityProfiles.values()).map(p => p.name)
);

// In _endRound(), before transitioning to idle:
const namesAtRoundEnd = new Set(
  Array.from(this._entityProfiles.values()).map(p => p.name)
);
const survivors = [...namesAtRoundEnd];
const removed   = [...namesAtRoundStart].filter(n => !namesAtRoundEnd.has(n));
```

### Round Number Tracking
**What:** A simple integer counter on WorldStage, incremented at the start of each round.
**When to use:** Lightweight progression indicator — no persistence needed for the PoC.

```typescript
private _roundNumber = 0;

async startRound(): Promise<void> {
  // ...
  this._roundNumber += 1;
  // ...
}
```

### Delaying the Draw-Mode Switch
**What:** The `onRoundPhaseChange('idle')` handler in `main.ts` currently calls `worldStage.toggle()` and `enableAllToolbar()` immediately. Change it to pass both those calls into the outcome card's `onDismiss` callback.
**Why:** The toolbar must stay disabled while the card is showing; only dismiss should re-enable it.

```typescript
// Before (current main.ts):
worldStage.onRoundPhaseChange = (phase: RoundPhase) => {
  if (phase === 'idle') {
    if (worldStage.inWorld) { worldStage.toggle(); viewToggleBtn.textContent = 'World'; }
    viewToggleBtn.disabled = false;
    enableAllToolbar();
    syncStartRoundBtn();
  }
  // ...
};

// After:
worldStage.onRoundPhaseChange = (phase: RoundPhase) => {
  if (phase === 'idle') {
    // Show outcome card; defer mode switch + re-enable to dismiss callback
    const outcomeData = worldStage.lastOutcome; // new getter
    roundOverlay.showOutcome(outcomeData, () => {
      if (worldStage.inWorld) { worldStage.toggle(); viewToggleBtn.textContent = 'World'; }
      viewToggleBtn.disabled = false;
      enableAllToolbar();
      syncStartRoundBtn();
    });
  }
  // ...
};
```

### Outcome Data Interface
**What:** A plain data object passed from WorldStage to the overlay.
**Where:** Can be defined inline in `WorldStage.ts` or in `shared/src/types.ts` — inline is simpler given it is only used in one place.

```typescript
export interface RoundOutcome {
  roundNumber: number;
  survivors: string[];   // entity names alive at round end
  removed: string[];     // entity names eliminated during round
}
```

### Anti-Patterns to Avoid
- **Storing a mutable "removed list" during the round:** Entities are deleted from maps when they fade out, so the snapshot-diff approach is reliable and avoids hooking into the async fade ticker.
- **Auto-dismissing the outcome card:** `RecognitionOverlay.showCard()` auto-dismisses after 5s — the outcome card must NOT do this. The player should read it at their own pace before drawing again.
- **Calling `enableAllToolbar()` before dismiss:** Toolbar must remain disabled while the card is visible. Only the dismiss callback enables it.
- **Re-using the same `_roundPhase = 'idle'` branch for both "no outcome yet" and "outcome shown":** The idle branch always shows the card; there is no second `done` state needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Survivor/removed tracking | Custom event bus or entity lifecycle hooks | Snapshot-diff on `_entityProfiles` map | Entities already self-remove from all maps in `removeEntity()` — the map IS the ground truth |
| Outcome card DOM | PixiJS graphics or HTML template literals in TS | Inline `document.createElement` per established pattern | Every other overlay in the project uses this pattern; mixing PixiJS text containers would break z-index layering |
| Idempotency guard | Boolean flags on the button | Already-present `dismissed` local variable in dismiss closure | Pattern proven in RecognitionOverlay |

## Common Pitfalls

### Pitfall 1: enableAllToolbar Before Card Dismiss
**What goes wrong:** Draw tools become available while the outcome card is still on screen; player can interact with the drawing canvas through/around the card.
**Why it happens:** The natural reflex is to re-enable on `'idle'` transition, not on dismiss.
**How to avoid:** Move ALL re-enable logic into the `onDismiss` callback. The `'idle'` handler does nothing except show the card.
**Warning signs:** If `syncStartRoundBtn()` or `enableAllToolbar()` appears in the `phase === 'idle'` branch of the phase-change handler after the change, something is wrong.

### Pitfall 2: Snapshot Timing
**What goes wrong:** The snapshot is taken after some entities have already been removed (the fade-out lasts 500ms and deletes from maps asynchronously).
**Why it happens:** `_endRound()` fires at 30s; fade-outs triggered in the last second of the round are still in progress at that moment. By the time the fade ticker completes, those containers are deleted — but `_endRound()` already ran.
**How to avoid:** Take the snapshot at the START of the round (in `startRound()`), not at the end. Entities that die during the round will be absent from `_entityProfiles` by the time `_endRound()` computes the diff.
**Warning signs:** Entities that die in the final second appear as "survivors" in the outcome card.

### Pitfall 3: Round Number Off-By-One
**What goes wrong:** Card reads "Round 0 Complete" on the very first round.
**Why it happens:** Counter starts at 0 and is incremented after the round ends rather than at start.
**How to avoid:** Increment `_roundNumber` at the start of `startRound()`, before any async work.

### Pitfall 4: z-index Conflict
**What goes wrong:** Outcome card appears behind countdown badge or behind the toolbar.
**Why it happens:** Countdown badge is `z-index: 100`, toolbar is `z-index: 10`, spinner is `z-index: 40`.
**How to avoid:** Give the outcome card overlay `z-index: 50` (above spinner at 40, above toolbar at 10, below countdown at 100 is fine since countdown will be gone by then — but using 110 is safer to be clearly above everything).
**Warning signs:** Card appears partially obscured.

### Pitfall 5: viewToggleBtn Stays Disabled After Dismiss
**What goes wrong:** After dismissing the outcome card and returning to draw mode, the view toggle button remains disabled.
**Why it happens:** `viewToggleBtn.disabled = false` was removed from the `'idle'` branch and accidentally not added to the dismiss callback.
**How to avoid:** The dismiss callback must set `viewToggleBtn.disabled = false` in addition to calling `enableAllToolbar()`.

## Code Examples

### showOutcome in RoundOverlay.ts

```typescript
// Add to RoundOverlay class
private _outcomeEl: HTMLDivElement | null = null;

showOutcome(data: RoundOutcome, onDismiss: () => void): void {
  if (this._outcomeEl) return; // guard: already showing

  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    if (this._outcomeEl) { this._outcomeEl.remove(); this._outcomeEl = null; }
    onDismiss();
  };

  const card = document.createElement('div');
  card.id = 'round-outcome';
  // CSS: position fixed, centered, z-index 50+, white card with shadow

  const heading = document.createElement('div');
  heading.className = 'round-outcome__heading';
  heading.textContent = `Round ${data.roundNumber} Complete`;

  const survivorSection = document.createElement('div');
  survivorSection.className = 'round-outcome__section';
  survivorSection.innerHTML = `<strong>Survived:</strong> ${
    data.survivors.length > 0 ? data.survivors.join(', ') : 'None'
  }`;

  const removedSection = document.createElement('div');
  removedSection.className = 'round-outcome__section';
  removedSection.innerHTML = `<strong>Eliminated:</strong> ${
    data.removed.length > 0 ? data.removed.join(', ') : 'None'
  }`;

  const hint = document.createElement('div');
  hint.className = 'round-outcome__hint';
  hint.textContent = 'Click to continue drawing';

  card.appendChild(heading);
  card.appendChild(survivorSection);
  card.appendChild(removedSection);
  card.appendChild(hint);
  document.body.appendChild(card);

  this._outcomeEl = card;
  card.addEventListener('click', dismiss);
}

hideOutcome(): void {
  if (this._outcomeEl) { this._outcomeEl.remove(); this._outcomeEl = null; }
}
```

### WorldStage changes (snapshot + lastOutcome getter)

```typescript
// New fields on WorldStage
private _roundNumber = 0;
private _namesAtRoundStart = new Set<string>();
private _lastOutcome: RoundOutcome | null = null;

get lastOutcome(): RoundOutcome | null {
  return this._lastOutcome;
}

// In startRound(), at the top after the idle guard:
this._roundNumber += 1;
this._namesAtRoundStart = new Set(
  Array.from(this._entityProfiles.values()).map(p => p.name)
);

// In _endRound(), before transitioning to idle:
const namesNow = new Set(
  Array.from(this._entityProfiles.values()).map(p => p.name)
);
this._lastOutcome = {
  roundNumber: this._roundNumber,
  survivors: [...namesNow],
  removed: [...this._namesAtRoundStart].filter(n => !namesNow.has(n)),
};
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `server/vitest.config.ts` |
| Quick run command | `pnpm run test` (from `server/`) |
| Full suite command | `pnpm run test` (from `server/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROUND-04 | Outcome data (survivors/removed/roundNumber) computed correctly from snapshot diff | unit | `pnpm --filter @crayon-world/server run test -- --reporter=verbose tests/roundOutcome.test.ts` | Wave 0 |
| ROUND-04 | `showOutcome` / `hideOutcome` idempotency | unit | `pnpm --filter @crayon-world/server run test -- --reporter=verbose tests/roundOutcome.test.ts` | Wave 0 |
| ROUND-04 | E2E loop: draw → start → outcome card → dismiss → draw | manual-only | N/A — requires browser + PixiJS rendering | manual |

The DOM-heavy outcome card and full round lifecycle require a browser. The unit-testable surface is the pure data computation (snapshot diff) and idempotency guards — these can be extracted into a testable function.

### Sampling Rate
- **Per task commit:** `pnpm --filter @crayon-world/server run test`
- **Per wave merge:** `pnpm --filter @crayon-world/server run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `server/tests/roundOutcome.test.ts` — covers snapshot-diff logic for ROUND-04

*(All other test infrastructure exists. Only the new outcome data logic needs a test file.)*

## Sources

### Primary (HIGH confidence)
- Direct source read: `client/src/world/RoundOverlay.ts` — existing overlay pattern and methods
- Direct source read: `client/src/world/WorldStage.ts` — `_endRound()`, entity maps, round phase state machine
- Direct source read: `client/src/main.ts` — `onRoundPhaseChange` handler, toolbar enable/disable logic
- Direct source read: `client/src/recognition/RecognitionOverlay.ts` — canonical `showCard` with dismiss callback pattern
- Direct source read: `client/src/style.css` — z-index values for all existing overlays (spinner: 40, countdown: 100, toolbar: 10)
- Direct source read: `.planning/phases/09-round-ui-end-to-end-integration/09-CONTEXT.md` — locked decisions and integration points

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — accumulated v1.1 decisions confirming `_removeEntity()` as single legal removal path and entity map design

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns verified from source
- Architecture: HIGH — snapshot-diff, dismiss callback, and DOM overlay patterns directly validated in existing code
- Pitfalls: HIGH — identified from direct reading of existing code paths (fade timing, z-index values, toolbar re-enable sequencing)

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable codebase, no external dependencies)
