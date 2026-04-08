# Phase 7: Round State Machine & Entity Removal - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

RoundPhase enum tracking round lifecycle (idle/analyzing/simulating/done), "Start Round" button in the toolbar, timed ~30s rounds, safe entity removal with full map/GPU cleanup, dying state exclusion. Survivors persist between rounds. No interaction behaviors (Phase 8) — just the infrastructure for rounds and removal.

</domain>

<decisions>
## Implementation Decisions

### Round lifecycle flow
- "Start Round" button in the toolbar — next to existing Submit/Clear/Undo buttons, disabled until entities exist in the world
- Pressing Start Round **auto-switches to world view** so the player sees the action immediately
- During analyzing phase (AI call): world view visible with entities frozen, spinner overlay indicates loading
- **All toolbar buttons disabled during a round** (analyzing + simulating) — clean separation between drawing and simulation
- RoundPhase enum: `idle` → `analyzing` → `simulating` → `done` (from research decision, not booleans)

### Entity removal experience
- Defeated entities **fade out over ~0.5 seconds** (alpha 1→0), matching the existing fade-in pattern
- **Label fades with the entity** in sync — they entered together, they leave together
- Entities are removed **instantly on fight contact** during the round (when aggressor reaches proximity threshold), not deferred to round end
- After fade completes: full cleanup of all 5 WorldStage maps + label sibling container + GPU texture via `container.destroy({children: true})`
- Entities in "dying" state (fading out) stop moving and are excluded from all interaction resolution

### Round timer behavior
- **Fixed 30-second rounds** — no player choice, can tune later
- **No early end** — timer always runs the full 30 seconds
- **Visible countdown timer** on screen during simulation — player knows how long to watch

### Between-round state
- When round ends: **auto-switch back to draw mode** — player can immediately draw more entities
- **Entities freeze between rounds** — no archetype movement in idle state, world is static
- **Draw/World toggle still works** between rounds — player can peek at surviving entities then switch back to draw

### Claude's Discretion
- Countdown timer placement and styling
- Spinner overlay design during analyzing phase
- Exact proximity threshold for fight contact (research suggests ~30px)
- How `_removeEntity()` handles the fade animation before final cleanup
- "Start Round" button styling and disabled state
- How RoundPhase transitions integrate with the existing toolbar enable/disable pattern

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/world/WorldStage.ts`: 5 entity maps (`_entityStates`, `_entityTextures`, `_entityProfiles`, `_entityLabels`, `_entitySpriteHeights`) — all must be cleaned on removal. Labels are sibling containers in `_worldRoot`.
- `client/src/world/EntitySprite.ts`: Existing fade-in animation pattern using `app.ticker` — fade-out follows the same approach
- `client/src/recognition/RecognitionOverlay.ts`: Spinner overlay pattern — reusable for analyzing phase loading state
- `client/src/main.ts`: Toolbar button enable/disable pattern — round phase gates same buttons
- `server/src/routes/interactions.ts`: POST /api/interactions route (Phase 6) — client calls this when Start Round is pressed

### Established Patterns
- HTML overlay for UI elements (toolbar, spinner, toasts)
- `app.ticker.add(fn)` for per-frame animation (fade-in uses `ticker.deltaMS`)
- Toolbar buttons disabled via DOM `.disabled` property
- `create-on-show, remove-on-dismiss` DOM pattern for overlays

### Integration Points
- WorldStage needs `RoundPhase` tracking and `startRound()` / `endRound()` methods
- `main.ts` adds "Start Round" button to toolbar, wires click handler to `worldStage.startRound()`
- Start Round handler calls `POST /api/interactions` with all entity profiles, receives matrix
- Entity removal needs `_removeEntity(container)` method cleaning all 5 maps + label + GPU resources
- Round timer drives phase transitions: `analyzing` → `simulating` (after API response) → `done` (after 30s)

</code_context>

<specifics>
## Specific Ideas

- The round lifecycle should feel like a dramatic reveal: press Start Round → spinner builds anticipation → simulation begins → entities interact → timer counts down → round ends → back to drawing
- Freezing entities between rounds makes the world feel like a diorama you're building up over time — each round animates your collection, then freezes again
- Instant removal on fight contact is more dramatic than deferred — you see the moment a predator catches its prey

</specifics>

<deferred>
## Deferred Ideas

- **Round summary overlay**: Showing who survived/was removed at round end — deferred, auto-switch to draw mode is sufficient for PoC
- **Early round end button**: Let player skip remaining time — not needed with fixed 30s
- **Variable round duration**: Player picks 15/30/60s — deferred to polish

</deferred>

---

*Phase: 07-round-state-machine-entity-removal*
*Context gathered: 2026-04-08*
