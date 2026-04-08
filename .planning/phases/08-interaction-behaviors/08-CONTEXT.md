# Phase 8: Interaction Behaviors - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Chase/flee/fight/symbiosis/ignore interaction behaviors wired into the WorldStage game tick. Uses the `_interactionMatrix` from Phase 7 to determine how entities respond to each other during simulation. Entities get a health field (HP=1 for now, architecture supports future HP>1). No new UI — just behavior logic in the simulation loop.

</domain>

<decisions>
## Implementation Decisions

### Chase & flee feel
- **Proximity-triggered** — both chase and flee only activate when the target is within detection range
- Outside detection range, entities resume their normal archetype movement (walking wander, flying arcs, etc.)
- When actively chasing or fleeing, the interaction force **completely overrides archetype movement** — a chasing wolf becomes a wolf moving directly toward prey, not a wandering wolf with a slight pull
- Nearest target wins for priority (from Phase 6 decision) — if multiple targets in range, entity responds to the closest one

### Fight resolution
- **Attacker always deals damage** — the entity with `fight` relationship deals 1 damage on contact
- Defender may deal damage back in the future, but for now only the attacker deals damage
- **HP system**: every entity starts with HP=1, architecture should support HP>1 later
- When HP reaches 0 → `removeEntity()` triggers the 0.5s fade-out (Phase 7)
- **Proximity threshold: ~30px** to trigger fight contact
- **One hit per contact** — attacker deals 1 damage when reaching proximity, then must move away and re-approach for another hit (relevant for future HP>1)
- One-sided fights: fire has `fight` toward tree, tree has `ignore` toward fire — fire approaches, tree stays put (rooted), fire reaches proximity → tree takes 1 damage → removed

### Symbiosis behavior
- **Drift toward + stay near** — symbiotic entities gently steer toward each other
- When close, they hover nearby (like orbiting) — no dramatic visual effect, just companionship
- **Proximity-triggered** — only drift toward each other when within detection range
- No speed boost or other mechanical benefit — purely movement-based proximity seeking

### Interaction + archetype blending
- **Rooted entities cannot move** — regardless of interactions. A tree can be chased and caught but cannot flee or pursue. Movement-based interactions are ignored for rooted archetypes.
- **Stationary entities cannot move but can still be targeted** — rocks can't chase or flee, but fire can approach and destroy a rock
- When no target is within detection range → **resume archetype movement** — wolf continues patrol wander, eagle continues flying arcs
- This means the game tick has two modes per entity: "interacting" (chase/flee/befriend override) or "idle" (archetype behavior)

### Claude's Discretion
- Detection range threshold (how far entities "see" targets — research suggests ~200px)
- Chase/flee steering speed (should match or exceed entity's base speed)
- Symbiosis approach speed (gentler than chase)
- How "one hit per contact" cooldown works (distance-based? time-based?)
- How the interaction logic integrates with the existing `_gameTick` loop (post-dispatch pass vs replacement)
- HP field location (on EntityState vs separate map)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/world/WorldStage.ts`: `_interactionMatrix` getter, `_entityProfiles` map (for name lookups), `_entityStates` map, `removeEntity()` method, `_dyingEntities` set, `_gameTick` loop with freeze guard
- `client/src/world/EntitySimulation.ts`: `dispatchBehavior(state, dt, world)` — existing archetype dispatch. Interaction behavior is a second pass after this, or replaces it when target is in range
- `shared/src/types.ts`: `InteractionMatrix`, `EntityRelationship`, `InteractionType` — the relationship data structure from Phase 6
- `client/src/world/behaviors/*.ts`: 6 pure archetype behavior functions — interaction override replaces these when active

### Established Patterns
- Pure behavior functions: `(state, dt, world) => state` contract
- `_gameTick` iterates `_entityStates` map, writes position to container
- Entity orientation: horizontal flip + ±45° tilt for walking/flying
- Label syncs position as sibling container

### Integration Points
- `_gameTick` is the main integration point — interaction logic runs after (or instead of) `dispatchBehavior`
- `_interactionMatrix` provides the relationship data per entity name
- `_entityProfiles` maps containers to profiles (for name-based relationship lookups)
- `removeEntity()` handles defeat cleanup (Phase 7)
- Spreading entity copies share parent's profile name — interaction lookups work by name

</code_context>

<specifics>
## Specific Ideas

- The "two modes" mental model is key: each entity is either in "interaction mode" (target in range, override archetype) or "idle mode" (no target in range, normal archetype behavior). This creates a dynamic world where entities roam naturally until encounters happen.
- Rooted/stationary entities being passive targets creates natural drama — fire chasing toward a helpless tree is a clear story the player can see unfolding.
- HP=1 with architecture for HP>1 means the fight system needs a clean damage/health interface even if it's trivially simple now.

</specifics>

<deferred>
## Deferred Ideas

- **HP > 1 / health bars**: Current HP is always 1 (one-hit kill). Future milestone can increase HP and add visible health bars.
- **Defender deals damage back**: Only attacker deals damage for now. Future: defender type determines if they fight back.
- **Speed boost from symbiosis**: Befriend currently has no mechanical benefit, just proximity. Future: nearby allies boost speed.
- **Detection range per entity**: Currently a single global detection range. Future: different entities could have different awareness radii.

</deferred>

---

*Phase: 08-interaction-behaviors*
*Context gathered: 2026-04-08*
