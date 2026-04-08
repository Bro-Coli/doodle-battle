---
phase: 08-interaction-behaviors
plan: "02"
subsystem: simulation
tags: [pixijs, interaction, entity, simulation, behavior]

# Dependency graph
requires:
  - phase: 08-01
    provides: interactionBehaviors.ts with resolveInteraction, applyInteractionSteering, DETECTION_RANGE, FIGHT_PROXIMITY_PX, FIGHT_COOLDOWN_MS
  - phase: 07-round-state-machine-entity-removal
    provides: WorldStage._gameTick, removeEntity, RoundPhase state machine
provides:
  - Full interaction behavior integration in WorldStage game tick loop
  - HP tracking per entity with fight contact removal
  - Name-to-ID map for stable cooldown keys
  - Fight cooldown system preventing instant multi-hits
  - Bounce-off-edge wall collision with interaction suppression cooldown
affects: [entity-simulation, world-stage, round-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-mode _gameTick dispatch — interaction steering when matrix present, archetype behavior as fallback
    - Fight cooldown keyed by "attackerId:targetId" stable integer pair
    - Bounce-off-edge walls with 0.5s bounce cooldown suppressing interaction steering after collision

key-files:
  created: []
  modified:
    - client/src/world/WorldStage.ts

key-decisions:
  - "Solid bounce-off-edge walls replace wrap-around — entities stay in view and collisions are visually legible"
  - "All distance constants converted from pixel literals to world-diagonal fractions — scale-independent across canvas sizes"
  - "0.5s bounce cooldown suppresses interaction steering after wall collision — prevents corner trapping"
  - "Fight contact triggered on both 'chase' and 'fight' interaction types — predator catching prey counts as damage"

patterns-established:
  - "Two-mode _gameTick: resolveInteraction when matrix present + movable, dispatchBehavior otherwise"
  - "_buildNameIdMap() called on startRound, cleared on endRound — consistent lifecycle"

requirements-completed: [INTR-01, INTR-02, INTR-03, INTR-04, INTR-05]

# Metrics
duration: ~30min
completed: 2026-04-08
---

# Phase 8 Plan 02: Interaction Behaviors — WorldStage Integration Summary

**Predator-prey chase/flee, hostile fight-on-contact entity removal, symbiotic drift, and neutral archetype pass-through wired into WorldStage._gameTick with HP tracking, fight cooldowns, and bounce-off-edge walls**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-08T05:53:48Z
- **Completed:** 2026-04-08
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 1

## Accomplishments

- Wired `resolveInteraction` and `applyInteractionSteering` from 08-01 into `_gameTick` — all 5 interaction types active during simulation
- Added HP map, name-ID map, and fight cooldown map with proper lifecycle management (build on startRound, clear on endRound)
- Replaced wrap-around position wrapping with solid bounce-off-edge walls and 0.5s bounce cooldown to prevent corner trapping
- Converted all distance constants to world-diagonal fractions for scale-independence across canvas sizes
- Human verified all 5 interaction types (chase, flee, fight, befriend, ignore) in live browser session

## Task Commits

1. **Task 1: Wire HP, name-ID map, fight cooldowns, and interaction pass in _gameTick** - `fe91dae` (feat)
2. **Task 2: Visual verification of all interaction behaviors** - human-verified, approved

## Files Created/Modified

- `client/src/world/WorldStage.ts` — Added _entityHp, _nameIdMap, _fightCooldowns maps; _buildNameIdMap(); _handleFightContact(); cooldown decrement in _gameTick; two-mode entity dispatch (interaction steering vs. archetype fallback); bounce-off-edge wall collision with bounce cooldown

## Decisions Made

- **Solid walls over wrap-around:** Wrap-around caused predator-prey pairs to teleport across the screen without visually chasing. Bounce-off-edge keeps entities in view and interactions legible.
- **World-diagonal fraction constants:** DETECTION_RANGE and related distances were pixel literals that broke at non-standard canvas sizes. Converted to fractions of world diagonal for scale-independence.
- **Bounce cooldown (0.5s):** Without it, entities bouncing off a corner immediately resumed steering into the same wall, creating jitter and corner trapping. Suppressing interaction steering for 0.5s after bounce gives the archetype behavior time to steer away from the wall first.
- **Chase triggers fight damage:** A predator using 'chase' interaction that reaches FIGHT_PROXIMITY_PX of its prey applies damage — not just 'fight' type entities. This is the correct predator-prey model.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced wrap-around with solid bounce-off-edge walls**
- **Found during:** Task 2 visual verification
- **Issue:** Entities were teleporting from one edge to the opposite edge — predator chasing prey visually lost the target on every wrap, making chase/flee illegible
- **Fix:** Changed position boundary logic from modulo wrap to velocity reflection (bounce). Added `_bounceCooldowns` map with 0.5s suppression of interaction steering after collision.
- **Files modified:** client/src/world/WorldStage.ts
- **Verification:** Visual — entities bounce cleanly off all four walls without corner trapping
- **Committed in:** fe91dae (Task 1 commit, retroactively included in same commit)

**2. [Rule 1 - Bug] Converted distance constants from pixel literals to world-diagonal fractions**
- **Found during:** Task 2 visual verification
- **Issue:** DETECTION_RANGE and FIGHT_PROXIMITY_PX were fixed pixel values from the 08-01 interface spec. At actual canvas dimensions the detection range was too small (entities never triggered interaction) or fight proximity threshold was proportionally wrong.
- **Fix:** Changed constants to be computed as fractions of `Math.hypot(worldWidth, worldHeight)` in WorldStage at tick time. Removed debug logging from startRound().
- **Files modified:** client/src/world/WorldStage.ts
- **Verification:** Visual — all 5 interaction types triggered reliably during human verification
- **Committed in:** fe91dae (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs found during visual verification)
**Impact on plan:** Both fixes required for correct behavior — interactions were either invisible (wrong scale) or visually broken (wrap-around). No scope creep.

## Issues Encountered

- Debug logging in `startRound()` was removed during implementation cleanup — kept console output clean for production testing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 interaction types (INTR-01 through INTR-05) verified working in live browser session
- Entity fight removal (fade-out), chase steering, flee steering, befriend drift, and ignore pass-through all functional
- Rooted/stationary entity immovability confirmed
- Phase 8 complete — ready for Phase 9 (polish / demo prep) or hackathon submission
- Remaining open items from STATE.md: interaction blend factor tuning, fight resolution metric tuning, symbiosis drift strength — all deferred to post-demo per prior decision

---
*Phase: 08-interaction-behaviors*
*Completed: 2026-04-08*
