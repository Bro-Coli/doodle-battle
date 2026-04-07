# Feature Landscape

**Domain:** AI-powered drawing browser game / creative sandbox
**Project:** Crayon World — v1.1 Entity Interactions & Rounds
**Researched:** 2026-04-07
**Confidence:** HIGH (core game patterns), MEDIUM (batch AI prompt design)

---

## Context: What Is Already Built

The following features are complete and must not be re-scoped:
- Freehand canvas drawing, stroke rendering, undo/clear
- Per-drawing Claude Haiku recognition (individual entity profiles)
- 6 archetype movement behaviors (walking, flying, rooted, spreading, drifting, stationary)
- Entity spawn from player drawings (sprite = captured drawing texture)
- Entity tooltips, multi-entity coexistence on `worldRoot` container
- Single shared `_gameTick` in `WorldStage` with `dispatchBehavior` dispatch
- Pure behavior functions: `(state, dt, world) => state` contract

This research covers ONLY the new features required for v1.1.

---

## Reference Games Analyzed

| Game | Relevant Feature | Lesson for v1.1 |
|------|-----------------|-----------------|
| Scribblenauts | Hand-authored category rules (all humans fear "monsters") | Category-level AI relationship rules work better than per-pair hardcoding. One LLM call per round to classify relationships is the right pattern. |
| Spore Creature Creator | Entity personality drives encounters | Players predict behavior — interaction outcomes should feel "correct" relative to real-world identity. Wolf defeats rabbit, not the reverse. |
| Classic RTS (AoE, StarCraft) | Round/wave structure | Clear state machine: draw phase → AI analysis → simulate phase → outcome → repeat. |
| Pokémon (battle system) | Win/lose states with persistence | Survivors carrying into next round creates strategic depth without multiplayer. |
| Google Quick Draw | Confidence display during analysis | A "calculating relationships..." moment before round start builds anticipation. |

---

## Table Stakes (Users Expect These)

Features expected once a round system is advertised. Missing any of these and the mechanic feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Explicit round start trigger** | Players must control when simulation begins, not have it auto-start. They need time to draw entities before the world activates. | LOW | A "Start Round" button in the toolbar. Currently `WorldStage.toggle()` moves to world view — round start is a distinct action from entering world view. |
| **Visible interaction analysis phase** | After "Start Round", the batch AI call takes 0.5–3 seconds. Blank pause feels like a crash. | LOW | "Analyzing relationships..." overlay or message. Reuse pattern from existing `RecognitionOverlay`. |
| **Chase/flee steering behavior** | Core predator-prey interaction. If a wolf doesn't chase a rabbit, the round system has no drama. | MEDIUM | Craig Reynolds' Seek and Flee steering: `desiredVelocity = normalize(target - position) * maxSpeed`, then blend with current velocity. Flee is same vector negated. This overrides the archetype's wandering movement when a relevant target is in range. |
| **Fight/destroy with entity removal** | A wolf that chases but never catches, or catches but nothing happens, feels broken. | MEDIUM | On proximity collision (distance < threshold), loser is marked defeated. Defeated entities fade alpha from 1.0 → 0 over ~1 second via ticker, then removed from `_entityStates` map and `worldRoot`. Container and label must both be destroyed to avoid memory leaks. |
| **Survivors persist across rounds** | Round system needs stakes. If every round resets, there is no accumulation. | LOW | `WorldStage` already holds entity maps between rounds. Simply do not clear them when a new round starts. Defeated entities are removed; living entities remain. |
| **Symbiosis behavior (minimal)** | If "ignore" is the only non-hostile relationship, the world feels antagonistic. Friendly interactions complete the relational vocabulary. | LOW | At minimum: friendly entities stay near each other (Seek with a larger threshold). No active benefit required for v1.1. |
| **Round outcome feedback** | Players need to know the round ended and what changed. Silent simulation cutoff is confusing. | LOW | A brief "Round X complete — N entities remain" message. |

---

## Differentiators (Competitive Advantage)

Features that make this demo distinctive at the hackathon.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Batch AI relationship analysis** | Single Haiku call classifies all entity pairs at once. The AI "understands the world" holistically rather than per-pair. This is the core v1.1 hook. | MEDIUM | Prompt sends all entity names + traits as context, asks for a relationship matrix. Response format: array of `{a: string, b: string, relationship: "predator" \| "prey" \| "symbiotic" \| "ignore"}` pairs. Claude Haiku has strong commonsense (wolf/rabbit = predator/prey without needing explicit training). Asymmetric: wolf is predator of rabbit, rabbit is prey of wolf — one entry per direction needed. |
| **World accumulation across rounds** | Surviving entities persist. Drawing a new round on top of the previous one creates an evolving ecosystem. Unlike a reset loop, the canvas remembers history. | LOW | Enabled by "survivors persist" table stake. The differentiator is framing it as an accumulating world, not just repeated rounds. |
| **Relationship reveal moment** | Briefly showing the relationship matrix before simulation starts ("Wolf hunts Rabbit. Rabbit flees Wolf.") — 2-3 seconds — builds anticipation. | LOW | Pure UI layer over existing tooltip infrastructure. High delight, low cost. |
| **Interaction steering blends with archetype** | Chase behavior should still respect archetype — a flying predator chases aerially, a walking predator stays on the ground. | MEDIUM | Behavior dispatch: if entity has an active chase/flee target, apply steering force on top of archetype base movement rather than replacing it. Partial blend factor avoids jarring direction snaps. |

---

## Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Per-pair AI calls at round start** | Seems thorough — get relationship for every combination individually. | With N entities, this is N*(N-1)/2 API calls. 6 entities = 15 calls. Expensive, slow, and breaks within the $100 budget. | Single batch call: list all entity names in one prompt, request full matrix in one response. |
| **HP/health point combat system** | Feels natural from RPGs. Wolf chips away at rabbit's HP. | Requires timers, values, and display. HP bars on crayon drawings look jarring and overload the scope. | Binary outcome on proximity contact. First close-contact trigger = fight resolved immediately. Simple, readable, zero UI overhead. |
| **Complex fight choreography** | Particles, hit animations, sounds. | Scope explosion. Not needed for hackathon demo. The interaction itself is the spectacle. | Fade-out on defeat + brief flash or color tint is sufficient visual feedback. |
| **Timed rounds with countdown clock** | Gives the round a natural end. | Adds a UI widget, a timer state, and pressure that conflicts with the relaxed sandbox feel. The loop should feel open-ended. | Round ends manually via "Next Round" button, or auto-ends when no more active interactions remain. |
| **Balanced/fair combat outcomes** | Players expect a "fair fight" with RNG. | Real-world identity IS the game. Wolf always beats rabbit. Counter-intuitive outcomes undercut the core value proposition. | Relationships are asymmetric and deterministic. Wolf is always predator, rabbit is always prey. No RNG in fight outcomes. |
| **Per-entity interaction memory** | Entities remember past encounters. | State complexity multiplies with entities and rounds. Colyseus compatibility depends on plain data. | Relationships are recalculated each round from profiles. Stateless per round. |

---

## Feature Dependencies

```
[Already built] Entity spawn + archetype movement
    └──requires──> Chase/flee steering behavior
                       └──requires──> Batch AI relationship analysis
                                          └──requires──> Round start trigger
                                                             └──requires──> Round outcome feedback

[Already built] _entityStates map in WorldStage
    └──enables──> Entity removal on defeat (remove key from map, destroy container)
    └──enables──> Survivor persistence (map survives between rounds — do not clear)

Chase/flee steering behavior ──enhances──> Archetype movement (blends on top, not replaces)

Entity removal ──requires──> Label removal (label is sibling container, must be removed separately)

Batch AI analysis ──feeds──> Relationship reveal moment (pure UI layer)

Symbiosis behavior ──similar to──> Chase (Seek with larger threshold, stop at proximity)
```

### Dependency Notes

- **Chase/flee requires batch AI analysis:** The steering behavior needs a relationship map (who chases whom) before it can direct entities. Round start must await the batch AI call completing before simulation tick activates interactions.
- **Entity removal requires label cleanup:** `WorldStage` stores entity containers and their label siblings in separate maps (`_entityLabels`, `_entitySpriteHeights`). Both must be removed from `worldRoot` and cleared from all five maps to prevent leaks.
- **Batch AI analysis requires at least 2 entities:** Single-entity worlds have no interactions. Round start with one entity should skip the batch call and proceed directly to simulation.
- **Survivor persistence requires no round-reset:** `WorldStage.spawnEntity()` adds to existing maps. As long as defeated entities are individually removed (not the whole map cleared), persistence is automatic.

---

## MVP Definition

### Launch With (v1.1 — hackathon demo)

Minimum viable features to demonstrate the interaction loop.

- [ ] **Batch AI relationship analysis** — single Haiku call with all entity names, returns relationship matrix
- [ ] **Round start trigger** — "Start Round" button, calls batch analysis, shows analyzing overlay, then activates interactions
- [ ] **Chase/flee steering** — predators seek prey, prey flees predators; blends with existing archetype movement
- [ ] **Entity removal on defeat** — alpha fade over ~1 second, then container + label destroyed and removed from all maps
- [ ] **Survivor persistence** — defeated entities removed, living entities remain when next round starts
- [ ] **Round outcome feedback** — minimal message "Round complete. N entities remain."

### Add After Validation (v1.1 post-demo polish)

- [ ] **Relationship reveal moment** — 2-3 second overlay showing "Wolf hunts Rabbit" before simulation begins
- [ ] **Symbiosis cohabitation** — friendly entities drift toward each other
- [ ] **Interaction blend factor** — smooth steering transition between wander and chase modes

### Future Consideration (v1.2+, multiplayer milestone)

- [ ] **Scenario objectives** — Population, Siege, Escort with scoring
- [ ] **Team-based drawing phases** — two players draw entities for opposing teams
- [ ] **Trait-influenced combat** — traits from profile ("armored", "venomous") modify interaction outcomes

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Batch AI relationship analysis | HIGH | MEDIUM | P1 |
| Round start trigger | HIGH | LOW | P1 |
| Chase/flee steering behavior | HIGH | MEDIUM | P1 |
| Entity removal on defeat | HIGH | LOW | P1 |
| Survivor persistence | HIGH | LOW | P1 |
| Round outcome feedback | MEDIUM | LOW | P1 |
| Relationship reveal moment | MEDIUM | LOW | P2 |
| Symbiosis behavior | MEDIUM | LOW | P2 |
| Interaction steering blend | LOW | MEDIUM | P2 |
| Scenario system | HIGH | VERY HIGH | P3 |
| Multiplayer | HIGH | VERY HIGH | P3 |

---

## Implementation Notes by Feature

### Batch AI Relationship Analysis

The prompt should send all entity names and their `role` strings (already in `EntityProfile`) in a single message. Example structure:

```
Entities in the world:
- Wolf (role: "Apex predator")
- Rabbit (role: "Small herbivore prey animal")
- Oak Tree (role: "Rooted plant providing shelter")

For each pair, classify the relationship from Wolf's perspective, Rabbit's perspective, etc.
Return JSON array: [{a: "Wolf", b: "Rabbit", relationship: "predator"}, ...]
Valid relationship values: "predator" | "prey" | "symbiotic" | "ignore"
```

Claude Haiku has strong enough commonsense reasoning for this pattern. The `traits` array from `EntityProfile` can supplement the `role` for ambiguous cases.

**New server route:** `/api/interactions` — accepts `entities: EntityProfile[]`, returns `InteractionRelationship[]`.

### Chase/Flee Steering

Craig Reynolds' Seek behavior: `steeringForce = normalize(target.pos - self.pos) * maxSpeed - self.velocity`. Applied as an acceleration impulse per tick. For Flee, negate the direction.

The behavior dispatcher in `EntitySimulation.ts` currently receives `(state, dt, world)`. For interactions, it needs access to other entities' positions. The `world` parameter should be extended to `WorldContext` that includes `entities: {id, x, y}[]` and a `relationships: Map<entityId, Relationship>` for the current entity. This keeps behavior functions pure while providing necessary context.

### Entity Removal

PixiJS pattern: alpha tween over ~60 frames (1 second at 60fps), then `container.destroy({children: true})`, `label.destroy({children: true})`, and removal from all five `WorldStage` maps. Alpha decrement per tick: `container.alpha -= dt` (since dt is in seconds, this gives 1-second fade). Guard with `alpha > 0` check before dispatch.

### Round State Machine

Five states: `idle` (before first round) → `drawing` (default, player draws) → `analyzing` (batch AI call in flight) → `simulating` (interactions active, ~30s) → `outcome` (round end message) → back to `drawing`.

`WorldStage` should expose a `roundPhase` property. Toolbar buttons enable/disable based on phase (no "Start Round" during analysis; no "Submit Drawing" during simulation).

---

*Feature research for: Crayon World v1.1 entity interactions and round system*
*Researched: 2026-04-07*
