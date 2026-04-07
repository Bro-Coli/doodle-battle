# Phase 5: Entity Simulation - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Every entity on the canvas moves in a way that matches its real-world identity. Six archetypes (walking, flying, rooted, spreading, drifting, stationary) produce visibly distinct movement patterns driven by delta-time. Entities wrap around the world edges. No entity-vs-entity interaction, no camera movement, no terrain — just identity-appropriate autonomous movement.

</domain>

<decisions>
## Implementation Decisions

### Archetype movement styles
- **Walking** (wolf, cat): Patrol wander — pick random direction, walk for a bit, pause briefly, pick new direction. Feels like an animal exploring territory.
- **Flying** (eagle, butterfly): Smooth sweeping arcs across the world. Faster than walkers, rarely stops. Soaring feel.
- **Spreading** (fire, moss): Periodically spawn smaller copies of itself at adjacent positions near the parent. No cap on copies but slow spawn rate. Copies don't spread further (no chain reaction). Copies stay near the parent entity — localized spread, not world-wide.
- **Drifting** (cloud, balloon): Slow, mostly-horizontal movement with gentle sine-wave vertical bobbing. Distinctly slower and floatier than walking. Wind-like feel.
- **Rooted** (tree, flower): Very subtle side-to-side sway animation. Stays in place but feels alive.
- **Stationary** (rock, landmark): Truly frozen — no movement or animation at all. Distinguished from rooted by having zero motion.

### World boundary behavior
- Wrap-around — entities exit one side and re-enter from the opposite side
- Fixed camera, single screen, no scrolling or panning (consistent with Phase 4 WorldStage)
- Spreading copies stay near their parent, not independently wrapping across the world

### AI speed parameter
- Extend EntityProfile with a `speed` field: numeric 1-10 scale returned by Claude
- 1 = very slow (snail), 10 = very fast (cheetah)
- Simulation maps this to actual pixels/second base rate
- Update the Claude Haiku prompt and server-side validation to include speed
- Update mock entities with appropriate speed values

### Movement personality
- Organic feel — variable speed, slight randomness, occasional pauses for walkers
- Each entity instance gets ~10-20% random variance on speed, pause duration, and turn frequency so two wolves don't move identically
- Traits from AI profile are display-only for now — movement driven purely by archetype + speed value

### Visual feedback during movement
- Sprites rotate to face their movement direction (walking and flying)
- Flying entities get a gentle sine-wave vertical bob to feel airborne
- Spreading copies are identical to original (same size, same opacity)
- Minimal effects otherwise — no trails, particles, or extra visual polish for PoC

### Claude's Discretion
- Exact speed-to-pixels/second mapping
- Patrol wander pause duration and direction change frequency
- Flying arc radius and curve tightness
- Spreading spawn interval and spawn radius
- Drifting sine-wave amplitude and frequency
- Rooted sway amplitude
- Exact variance ranges for instance randomization
- How spreading copies reuse the parent's texture

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/world/WorldStage.ts`: `worldRoot` container holds all entities, `spawnEntity()` handles placement — game loop hooks into `app.ticker` to update entity positions each frame
- `client/src/world/EntitySprite.ts`: `buildEntityContainer()` already uses `app.ticker` for fade-in animation — same pattern for movement updates
- `shared/src/types.ts`: `EntityProfile` type and `Archetype` union — needs `speed: number` field added
- `server/src/mock-entities.ts`: 6 mock entities covering all archetypes — needs speed values added
- `server/src/recognition/buildPrompt.ts`: Claude Haiku prompt — needs speed field added to JSON schema
- `server/src/recognition/validateProfile.ts`: Server-side validation — needs speed validation (1-10 range)

### Established Patterns
- PixiJS `app.ticker` for per-frame updates (delta-time via `ticker.deltaMS`)
- Entity containers are PixiJS Containers with sprite + label children
- HTML overlay for UI elements, PixiJS for game rendering
- Behavior functions should be pure (CLAUDE.md design principle)
- State is plain data for future Colyseus compatibility

### Integration Points
- `WorldStage.spawnEntity()` creates entity containers — needs to also initialize movement state per archetype
- `app.ticker` is the game loop — behavior update functions called each tick with delta time
- `EntityProfile.archetype` dispatches to the correct behavior function
- New `speed` field flows from Claude Haiku response through server validation to client simulation

</code_context>

<specifics>
## Specific Ideas

- Organic movement is key — entities should feel alive, not robotic. Variable speed and slight randomness make the world feel like a living ecosystem.
- The AI-provided speed value (1-10) is a creative extension — a wolf drawn by the player gets a speed that matches "wolf" not just "walking archetype." This makes each entity feel unique even within the same archetype.
- Spreading copies staying near the parent creates a visual "zone of influence" — fire spreading in an area feels more natural than fire teleporting across the world.
- Trait-influenced movement is explicitly deferred for now but is a clear enhancement path for advanced locomotion patterns.

</specifics>

<deferred>
## Deferred Ideas

- **Trait-influenced movement patterns**: Traits like "territorial" or "pack hunter" could map to movement modifiers (smaller wander radius, follow nearest entity). Deferred to future milestone for advanced locomotion.
- **Entity interaction**: Chasing, fleeing, combat — out of scope per PROJECT.md for PoC.
- **Camera follow / pan**: Fixed camera for PoC. Scrolling world deferred.

</deferred>

---

*Phase: 05-entity-simulation*
*Context gathered: 2026-04-07*
