---
phase: 05-entity-simulation
verified: 2026-04-07T17:04:00Z
status: human_needed
score: 18/18 automated must-haves verified
re_verification: false
human_verification:
  - test: "Visual verification of all 6 archetype movement patterns"
    expected: "Wolf wanders with pauses, Eagle arcs smoothly with bob, Oak sways in place without drifting, Fire spawns nearby copies that don't chain-react, Cloud bobs horizontally without vertical drift, Rock holds completely still. All 6 coexist simultaneously."
    why_human: "Movement patterns are visual — only a browser run can confirm each archetype produces identity-appropriate motion. Plan 03 Task 2 was marked as a human-verify checkpoint. SUMMARY reports this was approved but no automated check covers it."
---

# Phase 5: Entity Simulation Verification Report

**Phase Goal:** Every entity on the canvas moves in a way that matches its real-world identity — a wolf walks, a bird flies, a tree stays rooted
**Verified:** 2026-04-07T17:04:00Z
**Status:** human_needed — all automated checks pass; visual behavior requires human confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | EntityProfile includes a speed field (number 1-10) | VERIFIED | `shared/src/types.ts:17` — `speed: number; // 1-10 scale` |
| 2  | Server validation clamps or defaults speed to 5 when invalid | VERIFIED | `validateProfile.ts:41-45` — clamp+round+default pattern; all 47 tests pass |
| 3  | Claude Haiku prompt asks for a speed value in the JSON schema | VERIFIED | `buildPrompt.ts:14` — `"speed": number // 1-10 how fast this entity moves in real life (1=snail, 10=cheetah)` |
| 4  | All 6 mock entities have speed values appropriate to their identity | VERIFIED | `mock-entities.ts` — Wolf=7, Eagle=8, Oak=1, Fire=6, Cloud=3, Rock=1 |
| 5  | Walking entities wander with patrol pattern: walk, pause, change direction | VERIFIED | `walkingBehavior.ts` — pauseTimer/walkTimer state machine; transition logic at lines 41-53 |
| 6  | Flying entities sweep in smooth arcs with vertical sine bob | VERIFIED | `flyingBehavior.ts` — angularVelocity turn + bobOriginY + sin(bobPhase)*8 |
| 7  | Rooted entities sway side-to-side from a fixed origin without drifting | VERIFIED | `rootedBehavior.ts` — originX never mutated; x = originX + sin(swayPhase)*3 |
| 8  | Spreading entities signal pendingSpawn at intervals (copies flagged isACopy) | VERIFIED | `spreadingBehavior.ts` — isACopy short-circuit at line 14; pendingSpawn set when timer expires |
| 9  | Drifting entities move slowly horizontal with sine-wave vertical bob from fixed origin | VERIFIED | `driftingBehavior.ts` — bobOriginY constant; y = bobOriginY + sin(bobPhase)*bobAmplitude |
| 10 | Stationary entities produce no state changes | VERIFIED | `stationaryBehavior.ts` — returns state reference identity (confirmed by test) |
| 11 | All movement uses deltaMS/1000 for frame-rate independence | VERIFIED | `WorldStage.ts:96` — `const dt = ticker.deltaMS / 1000`; all behaviors take dt in seconds |
| 12 | Entities move immediately after spawning in world view | VERIFIED | `WorldStage.ts:85-88` — initEntityState called in spawnEntity before addChild; gameTick iterates all entries |
| 13 | Walking and flying entities rotate to face movement direction | VERIFIED | `WorldStage.ts:107-110` — atan2(vy, vx) guarded by velocity threshold 0.01 |
| 14 | Entities wrap around world edges | VERIFIED | wrapPosition used in walkingBehavior, flyingBehavior, driftingBehavior; 5 wrapPosition unit tests pass |
| 15 | Spreading entity spawns copies near itself over time | VERIFIED | `WorldStage.ts:127-153` — _spawnCopy places copies within spawnRadius using random angle+dist |
| 16 | Multiple entities of different archetypes move simultaneously | VERIFIED | `WorldStage.ts:99-120` — single gameTick iterates all Map entries; no per-entity ticker registration |
| 17 | All 6 behavior movement patterns visually distinct and identity-appropriate | NEEDS HUMAN | Cannot verify visually — requires browser run with MOCK_AI=true and 6 spawns |
| 18 | ENTY-02 satisfied end-to-end | VERIFIED (automated) / NEEDS HUMAN (visual) | Pipeline from EntityProfile.speed through behavior dispatch to container position is fully wired |

**Automated Score:** 17/18 truths verified programmatically (truth 17 requires human)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/src/types.ts` | EntityProfile with `speed: number` field | VERIFIED | Line 17 — speed field present with comment |
| `server/src/recognition/validateProfile.ts` | Speed validation (1-10, default 5) | VERIFIED | Lines 41-45 — clamp + round + default; mysteryBlob returns speed 5 |
| `server/src/recognition/buildPrompt.ts` | Claude prompt requesting speed field | VERIFIED | Line 14 — speed in JSON schema with anchors |
| `server/src/mock-entities.ts` | 6 mock entities with speed values | VERIFIED | All 6 present with appropriate identity-based speeds |
| `client/src/world/EntitySimulation.ts` | EntityState union, initEntityState, dispatchBehavior, wrapPosition, mapSpeed | VERIFIED | All exported; 241 lines; no PixiJS imports |
| `client/src/world/behaviors/walkingBehavior.ts` | updateWalking pure function | VERIFIED | 68 lines; patrol state machine; no PixiJS |
| `client/src/world/behaviors/flyingBehavior.ts` | updateFlying pure function | VERIFIED | 47 lines; arc + bob; no PixiJS |
| `client/src/world/behaviors/rootedBehavior.ts` | updateRooted pure function | VERIFIED | 21 lines; fixed origin sway; no PixiJS |
| `client/src/world/behaviors/spreadingBehavior.ts` | updateSpreading pure function | VERIFIED | 33 lines; pendingSpawn timer + isACopy guard; no PixiJS |
| `client/src/world/behaviors/driftingBehavior.ts` | updateDrifting pure function | VERIFIED | 28 lines; fixed bobOriginY horizontal drift; no PixiJS |
| `client/src/world/behaviors/stationaryBehavior.ts` | updateStationary pure function | VERIFIED | 14 lines; identity return; no PixiJS |
| `server/tests/behaviors.test.ts` | Unit tests for all 6 behavior functions and utilities | VERIFIED | 169 lines; 12 tests covering wrapPosition, no-drift, copy suppression, stationary identity, walking state machine |
| `client/src/world/WorldStage.ts` | Game loop integration with entity state map | VERIFIED | `_entityStates`, `_gameTick`, `_spawnCopy` all present; single shared ticker |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `shared/src/types.ts` | `server/src/recognition/validateProfile.ts` | `import type { Archetype, EntityProfile }` | WIRED | Line 1 of validateProfile.ts |
| `server/src/recognition/validateProfile.ts` | `shared/src/types.ts` | returns EntityProfile with speed | WIRED | Line 47-53 — speed included in returned object |
| `client/src/world/EntitySimulation.ts` | `client/src/world/behaviors/*.ts` | imports and dispatches by archetype | WIRED | Lines 2-7 — all 6 behaviors imported; dispatch switch at lines 226-239 |
| `client/src/world/EntitySimulation.ts` | `@crayon-world/shared/src/types` | Archetype type for dispatch | WIRED | Line 1 — `import type { Archetype }` |
| `server/tests/behaviors.test.ts` | `client/src/world/EntitySimulation.ts` | imports wrapPosition, initEntityState, dispatchBehavior | WIRED | Lines 3-6 |
| `client/src/world/WorldStage.ts` | `client/src/world/EntitySimulation.ts` | imports initEntityState, dispatchBehavior | WIRED | Lines 6-10; called at lines 85, 100, 144 |
| `client/src/world/WorldStage.ts` | `app.ticker` | single shared ticker listener iterating entity map | WIRED | Line 44 — `app.ticker.add(this._gameTick)` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ENTY-02 | 05-01, 05-02, 05-03 | Entity moves according to its archetype (walking, flying, rooted, spreading, drifting, stationary) | VERIFIED (automated) / NEEDS HUMAN (visual) | Full pipeline implemented: speed in EntityProfile, 6 pure behavior functions, dispatcher, WorldStage game loop. Visual confirmation from SUMMARY 05-03 reports all 6 archetypes verified in browser — awaiting human re-confirmation. |

No orphaned requirements: REQUIREMENTS.md traceability table maps only ENTY-02 to Phase 5. All three plans (05-01, 05-02, 05-03) claim ENTY-02 consistently.

---

### Anti-Patterns Found

No anti-patterns detected in any simulation file.

Scanned: `EntitySimulation.ts`, `WorldStage.ts`, all 6 behavior files.

- No TODO/FIXME/HACK/PLACEHOLDER comments
- No stub return values (return null, return {}, return [])
- No console.log calls
- No PixiJS imports in any behavior function
- No per-entity ticker registration (confirmed single shared `_gameTick`)

One minor observation (not a blocker): `_spawnCopy` in WorldStage mutates the returned `copyState` object directly via `(copyState as SpreadingState).isACopy = true` instead of spreading it. This violates the pure/immutable pattern established by the behaviors. The mutation occurs immediately before storing in the map, so functionally correct, but inconsistent with the "no mutation" convention. SUMMARY notes this as an accepted deviation ("isACopy flag set at init time on spread copies").

---

### Human Verification Required

#### 1. All 6 Archetype Movement Patterns in Browser

**Test:**
1. Start both servers: `pnpm run dev:client` (terminal 1) and `pnpm run dev:server` (terminal 2)
2. Confirm `.env` has `MOCK_AI=true`
3. Open http://localhost:5173
4. Draw something and submit 6 times (each returns a different mock entity cycling Wolf, Eagle, Oak, Fire, Cloud, Rock). After each result card, dismiss and switch to World view.

**Expected per archetype:**
- Wolf (walking): Wanders, pauses 0.5-1.5s, picks new direction. Rotates sprite to face direction. Wraps at edges.
- Eagle (flying): Sweeps in arcs, noticeably faster than Wolf. Gentle vertical bob. Rotates to face direction.
- Oak (rooted): Extremely subtle 3px side-to-side sway. Does NOT drift from spawn position.
- Fire (spreading): Stays stationary but after 3-5s spawns a copy nearby (within ~80px). The copy does NOT spawn further copies.
- Cloud (drifting): Slow horizontal drift with gentle bob. Does NOT drift vertically over time. Wraps horizontally.
- Rock (stationary): Completely motionless. No animation.

**Expected — coexistence:** All 6 entities visible simultaneously in world view, each moving in its distinct pattern.

**Why human:** Movement patterns are inherently visual. The code paths are verified but correctness of the visual experience (smoothness, distinctiveness, identity-appropriateness) cannot be determined programmatically.

---

### Gaps Summary

No automated gaps. All artifacts exist, are substantive (not stubs), and are correctly wired. All 47 tests pass. TypeScript compiles cleanly.

The sole outstanding item is human visual verification of all 6 archetype movement patterns in the browser. Plan 05-03 Task 2 designated this as a `checkpoint:human-verify` gate. The 05-03 SUMMARY reports the human gate was approved during execution, but independent re-confirmation is recommended before closing the phase.

---

_Verified: 2026-04-07T17:04:00Z_
_Verifier: Claude (gsd-verifier)_
