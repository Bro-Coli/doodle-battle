---
phase: 08-interaction-behaviors
plan: "01"
subsystem: interaction-behaviors
tags: [tdd, pure-functions, steering, entity-interactions]
dependency_graph:
  requires: []
  provides: [interactionBehaviors.ts]
  affects: [WorldStage game tick, entity simulation loop]
tech_stack:
  added: []
  patterns: [pure-functions, generic-container-type, TDD red-green-refactor]
key_files:
  created:
    - client/src/world/interactionBehaviors.ts
    - server/tests/interactionBehaviors.test.ts
  modified: []
decisions:
  - "Generic container type T allows testing without PixiJS (plain objects as map keys)"
  - "befriendPosition uses linear damping factor = dist/arriveRadius when dist < arriveRadius"
  - "applyInteractionSteering checks for vx/vy presence to conditionally update velocity fields"
  - "Speed defaults to 80 for archetypes without a speed field (rooted, spreading, stationary)"
metrics:
  duration: "2 minutes"
  completed_date: "2026-04-07"
  tasks: 3
  files: 2
---

# Phase 8 Plan 01: Interaction Behavior Pure Functions Summary

**One-liner:** Pure steering math (seek/flee/befriend) and interaction resolution with generic container type, fully tested via TDD.

## Tasks Completed

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| RED  | test | 68fb8f4 | 31 failing tests covering constants, steering functions, resolveInteraction, applyInteractionSteering |
| GREEN | feat | 82877c6 | Full implementation of interactionBehaviors.ts — all 31 tests pass |
| REFACTOR | — | — | No refactor needed; TypeScript compiled clean with strict mode |

## What Was Built

`client/src/world/interactionBehaviors.ts` exports:

**Constants:**
- `DETECTION_RANGE = 200` — pixel radius for interaction detection
- `FIGHT_PROXIMITY_PX = 30` — close-enough distance for fight resolution
- `FIGHT_COOLDOWN_MS = 2000` — fight cooldown duration
- `BEFRIEND_ARRIVE_RADIUS = 60` — radius where befriend damping begins

**Steering functions:**
- `seekPosition(sx, sy, tx, ty, speed, dt)` — normalize direction, move toward target
- `fleePosition(sx, sy, tx, ty, speed, dt)` — reverse direction, move away
- `befriendPosition(sx, sy, tx, ty, speed, dt, arriveRadius?)` — seek with linear speed damping within arrive radius

**Resolution:**
- `resolveInteraction<T>(selfContainer, entityStates, entityProfiles, dyingEntities, matrix, nameIdMap, detectionRange)` — finds nearest non-ignore entity within range, skips dying entities, returns `{type, targetContainer, distance}` or null

**Application:**
- `applyInteractionSteering<T>(state, resolved, targetState, dt)` — applies correct steering per interaction type (chase/flee/fight/befriend), spreads result onto state preserving all archetype-specific fields

**Speed multipliers by type:**
- chase → speed × 1.0 (seekPosition)
- flee → speed × 1.1 (fleePosition)
- fight → speed × 1.0 (seekPosition — approach to fight)
- befriend → speed × 0.5 (befriendPosition at half speed)
- ignore → no steering applied

## Test Coverage

31 tests in `server/tests/interactionBehaviors.test.ts`:
- Constants (4 tests)
- seekPosition (5 tests: directional, diagonal, zero-distance, < 1px, dt scaling)
- fleePosition (4 tests: x-axis, y-axis, diagonal, zero-distance)
- befriendPosition (4 tests: full speed far away, reduced speed near, custom radius, zero-distance)
- resolveInteraction (6 tests: not in matrix, all-ignore, out of range, in-range, skips dying, picks nearest)
- applyInteractionSteering (8 tests: each type, field preservation, vx/vy update, default speed)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `client/src/world/interactionBehaviors.ts` exists
- [x] `server/tests/interactionBehaviors.test.ts` exists
- [x] Commit 68fb8f4 (RED) exists
- [x] Commit 82877c6 (GREEN) exists
- [x] All 88 server tests pass (31 new + 57 existing)
- [x] TypeScript compiles clean with strict mode

## Self-Check: PASSED
