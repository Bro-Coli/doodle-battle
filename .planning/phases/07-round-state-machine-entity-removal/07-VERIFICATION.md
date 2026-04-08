---
phase: 07-round-state-machine-entity-removal
verified: 2026-04-07T00:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Full round lifecycle — idle to analyzing to simulating to idle"
    expected: "Spinner appears during analyzing, countdown badge counts down during simulating, view auto-switches, toolbar gates correctly"
    why_human: "DOM overlay visibility and timing require a running browser; TypeScript type-checks pass but behavior is visual"
  - test: "Entity fade-out is perceptually smooth over ~0.5s"
    expected: "Entity and label both fade to invisible over 500ms before disappearing"
    why_human: "Fade is driven by PixiJS ticker — correct only in a running PixiJS context"
---

# Phase 7: Round State Machine & Entity Removal — Verification Report

**Phase Goal:** The game knows which phase of a round it is in, and entities can be safely removed from all data structures without leaving ghost state
**Verified:** 2026-04-07
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Entities freeze (stop moving) when round phase is not simulating | VERIFIED | `_gameTick` line 142: `if (this._roundPhase !== 'simulating') return;` — hard early return skips all entity updates |
| 2 | Dying entities do not move or participate in behavior dispatch | VERIFIED | `_gameTick` line 149: `if (this._dyingEntities.has(container)) continue;` — dying containers skipped before `dispatchBehavior` |
| 3 | Removing an entity fades it out over 0.5s then deletes from all 5 maps, destroys label and container | VERIFIED | `removeEntity()` lines 295–326: 500ms fade via ticker, deletes all 5 maps + `_dyingEntities`, calls `label?.destroy` then `container.destroy({ children: true })` in correct order |
| 4 | A round transitions idle→analyzing→simulating→idle (no intermediate done state) | VERIFIED | `startRound()` transitions through analyzing→simulating; `_endRound()` sets `_roundPhase = 'idle'` directly. `RoundPhase` type is `'idle' \| 'analyzing' \| 'simulating'` — no done variant |
| 5 | Surviving entities remain in all maps after round ends | VERIFIED | `_endRound()` does not touch any entity map — only clears `_interactionMatrix`, stops timer, and transitions phase |
| 6 | Round auto-ends after 30 seconds of simulation | VERIFIED | `startRound()` line 263: `this._roundTimer = window.setTimeout(() => this._endRound(), 30_000)` |
| 7 | Start Round button exists in toolbar, disabled when no entities or round is active | VERIFIED | `main.ts` lines 54–57: button created with `disabled = true`; `syncStartRoundBtn()` at line 100 gates on `entityCount === 0 \|\| roundPhase !== 'idle'`; appended to toolbar at line 247 |
| 8 | Pressing Start Round auto-switches to world view | VERIFIED | Click handler lines 184–187: `if (!worldStage.inWorld) { worldStage.toggle(); viewToggleBtn.textContent = 'Draw'; }` |
| 9 | All toolbar buttons are disabled during analyzing and simulating phases | VERIFIED | Click handler calls `disableAllToolbar()` (line 188) which disables submit, clear, undo, startRound, and all thickness buttons |
| 10 | Toolbar re-enables and view switches back to draw mode when round ends | VERIFIED | `onRoundPhaseChange` callback (line 193): on `'idle'`, toggles back to draw mode and calls `enableAllToolbar()` + `syncStartRoundBtn()` |
| 11 | Start Round button re-enables only when entities exist and phase is idle | VERIFIED | `syncStartRoundBtn()` line 100: `startRoundBtn.disabled = worldStage.entityCount === 0 \|\| worldStage.roundPhase !== 'idle'` |
| 12 | A spinner overlay is visible during the analyzing phase | VERIFIED | `RoundOverlay.showAnalyzingSpinner()` creates `div#round-spinner` with full-screen backdrop and `.spinner` ring; called in `startRound()` line 248; `.spinner` CSS class with `animation: spin` exists in `style.css` line 119 |

**Score: 12/12 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/world/WorldStage.ts` | RoundPhase type, _dyingEntities, removeEntity(), startRound(), _endRound(), gameTick guards, entityCount/roundPhase/interactionMatrix getters | VERIFIED | All fields, methods, and getters present; substantive — 327 lines with full implementations; wired (imported by main.ts) |
| `client/src/world/fetchInteractions.ts` | Client-side fetch helper for POST /api/interactions | VERIFIED | 22-line file; exports `fetchInteractions(profiles)`; POSTs JSON body, throws on non-ok, returns typed `InteractionMatrix` |
| `client/src/world/RoundOverlay.ts` | DOM overlay for analyzing spinner and countdown timer | VERIFIED | 112-line file; exports `RoundOverlay` class; `showAnalyzingSpinner`, `hideAnalyzingSpinner`, `startCountdown`, `stopCountdown` all implemented with substantive DOM logic |
| `client/src/main.ts` | Start Round button creation, click handler, phase change callback wiring | VERIFIED | `startRoundBtn` created at line 54, click handler at line 180, `onRoundPhaseChange` at line 193 |
| `client/src/style.css` | Styles for Start Round button and round overlay elements | VERIFIED | `#start-round` at line 294, `#round-countdown` at line 321; spinner uses existing `.spinner` class (line 119) via inline id `round-spinner` — consistent with plan allowing CSS or inline styles |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `WorldStage.ts` | `fetchInteractions.ts` | `startRound()` calls `fetchInteractions()` | WIRED | Line 6 import + line 252 call inside try/catch in `startRound()` |
| `WorldStage.ts` | `RoundOverlay.ts` | `startRound()`/`_endRound()` calls overlay methods | WIRED | Line 7 import; `showAnalyzingSpinner` (248), `hideAnalyzingSpinner` (259), `startCountdown` (262), `stopCountdown` (276) all called |
| `WorldStage._gameTick` | `_dyingEntities` | Skip dying entities before dispatchBehavior | WIRED | `_dyingEntities.has(container)` at line 149, before `dispatchBehavior` call at line 151 |
| `WorldStage._gameTick` | `_roundPhase` | Early return when phase is not simulating | WIRED | `_roundPhase !== 'simulating'` at line 142 — first statement in `_gameTick` |
| `main.ts` | `WorldStage.startRound()` | startRoundBtn click handler | WIRED | `void worldStage.startRound()` at line 189 |
| `main.ts` | `WorldStage.onRoundPhaseChange` | Callback reacting to phase transitions | WIRED | `worldStage.onRoundPhaseChange = (phase: RoundPhase) => { ... }` at line 193 |
| `WorldStage phase callback` | `toolbar enable/disable` | `disableAllToolbar`/`enableAllToolbar` called on phase change | WIRED | `enableAllToolbar()` called at line 201 (idle phase); `disableAllToolbar()` called from click handler at line 188 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ROUND-01 | 07-02 | Player can press "Start Round" to begin a round after drawing entities | SATISFIED | `startRoundBtn` wired in `main.ts`; enabled by `syncStartRoundBtn()` after entity spawn |
| ROUND-02 | 07-01, 07-02 | Round runs for a timed duration (~30 seconds) then ends automatically | SATISFIED | `window.setTimeout(() => this._endRound(), 30_000)` in `startRound()` |
| ROUND-03 | 07-01, 07-02 | Surviving entities persist into the next round — world accumulates | SATISFIED | `_endRound()` does not clear any entity map; entities are only removed via explicit `removeEntity()` |
| REMV-01 | 07-01 | Defeated entities fade out and are fully removed (container, state, label, texture references) | SATISFIED | `removeEntity()`: 0.5s fade, deletes all 5 maps (`_entityStates`, `_entityTextures`, `_entityProfiles`, `_entityLabels`, `_entitySpriteHeights`), calls `label?.destroy` and `container.destroy({ children: true })` |
| REMV-02 | 07-01 | Entities in "dying" state do not participate in further interactions | SATISFIED | `_dyingEntities` Set; `_gameTick` skips any container in this set; `removeEntity()` is idempotent via has-guard |

**No orphaned requirements.** REQUIREMENTS.md traceability table maps ROUND-01/02/03, REMV-01/02 to Phase 7 — all accounted for. ROUND-04 is mapped to Phase 9 (pending) and is correctly out of scope for Phase 7.

---

### Anti-Patterns Found

No anti-patterns detected. Scanned `WorldStage.ts`, `fetchInteractions.ts`, `RoundOverlay.ts`, and `main.ts` for:
- TODO/FIXME/PLACEHOLDER comments — none found
- Empty implementations (`return null`, `return {}`, `=> {}`) — none found
- Stub handlers (only `console.log` or `preventDefault`) — none found

One observation (info, not a blocker):

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `WorldStage.ts` | 78–79 | `entityCount` returns `_entityStates.size` which includes dying entities for up to 0.5s during fade | Info | `syncStartRoundBtn` may show button enabled while a dying entity is still in the map. Not a bug — dying entity is excluded from behavior; button enabling during a 0.5s window is imperceptible. No fix required. |

---

### Human Verification Required

#### 1. Full Round Lifecycle (visual flow)

**Test:** Start two entities via Submit, click Start Round, observe the full cycle
**Expected:** Spinner appears briefly during analyzing, transitions to countdown badge counting 30→0, entities move during countdown, view auto-switches to draw and toolbar re-enables when countdown ends
**Why human:** DOM overlay creation and PixiJS ticker-driven entity motion cannot be verified without a running browser

#### 2. Entity Fade-Out Animation

**Test:** Trigger `removeEntity()` on a live entity (requires Phase 8 fight resolution, or temporary manual test)
**Expected:** Entity and label both smoothly fade to transparent over ~0.5 seconds then disappear
**Why human:** PixiJS ticker callbacks only execute when the application loop is running

---

### Gaps Summary

No gaps. All 12 observable truths are verified against the codebase. All 5 requirement IDs (ROUND-01, ROUND-02, ROUND-03, REMV-01, REMV-02) have satisfying implementations. TypeScript compiles cleanly. Commits b65edff, 2e45f82 (Plan 01) and d863925 (Plan 02) exist in git history and match declared file changes.

The two human verification items are standard visual/runtime behaviors that cannot be confirmed statically — they were flagged as human-verify in the plan itself (Plan 02 Task 2 was a blocking human checkpoint that the user approved).

---

_Verified: 2026-04-07_
_Verifier: Claude (gsd-verifier)_
