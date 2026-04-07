# Phase 4: Entity Spawn & Rendering - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Entities appear in a separate game world view as distinct visual objects after recognition. The drawing canvas and game world are separate full-screen views with a manual toggle. Entities use the player's drawing as their sprite, have floating name labels, and show behavior profiles on hover. Multiple entities coexist simultaneously. No movement or simulation — just visual presence.

</domain>

<decisions>
## Implementation Decisions

### Entity visual appearance
- Entity sprite IS the player's drawing — captured as a texture from the drawing canvas
- Transparent background (strokes only, no white rectangle) so entities don't occlude each other
- Proportional scaling — entities are scaled down from original drawing size (roughly 1:5 ratio), preserving relative size differences (bigger drawings = bigger entities)
- Subtle drop shadow behind entity sprite so it lifts off the canvas

### Label & profile display
- Floating name label centered above the entity sprite, always visible
- Behavior profile (traits, role, archetype) shown as a simple text popup on hover — not persistent
- The Phase 3 recognition card already satisfies the "profile displayed at spawn time" requirement (RECG-05) — no additional spawn-time UI needed
- Tooltip content: plain text format — "Wolf — Walking \n Traits: predatory, pack hunter \n Role: Apex predator"

### Spawn moment & placement
- Entities spawn immediately after recognition (card dismiss) — not queued for a batch spawn
- Random position within the game world bounds
- Simple fade-in animation (~0.3 seconds) when entity appears

### Game world architecture
- Drawing canvas and game world are SEPARATE full-screen views — not the same PixiJS stage
- Manual toggle button to switch between "Draw" mode and "World" mode
- Game world is a separate PixiJS stage/container, same viewport size (no scrolling/camera)
- Plain white/light background — no biome or terrain (out of scope per PROJECT.md)

### Multi-entity coexistence
- No limit on number of entities — player can add as many as they want
- No entity removal for PoC — once spawned, entities stay
- Entities may overlap freely — no collision avoidance in this phase

### Claude's Discretion
- Toggle button placement and styling
- Game world PixiJS setup (separate Application or Container swap)
- Exact fade-in animation implementation
- Drop shadow technique (PixiJS filter or manual)
- Entity tooltip positioning logic
- Exact 1:5 scaling ratio (can adjust for visual quality)
- How entity sprite texture is captured from the drawing strokes

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/drawing/DrawingCanvas.ts`: `strokeContainerRef` getter provides access to all drawn strokes for texture capture
- `client/src/drawing/exportPng.ts`: Already extracts drawing region with bounding box — similar logic could capture entity sprites
- `client/src/recognition/RecognitionOverlay.ts`: Card popup pattern reusable for tooltip design
- `client/src/main.ts:102-104`: Card dismiss callback is the integration point — entity spawns here
- `shared/src/types.ts`: EntityProfile type already defined

### Established Patterns
- PixiJS v8: `new Application()` then `await app.init()`
- HTML overlay for UI elements (toolbar, buttons, badges)
- Drawing canvas is a bounded region inside the PixiJS stage
- Named exports preferred

### Integration Points
- Card dismiss callback in `main.ts` → spawn entity in game world with profile + drawing texture
- `submitRecognition()` function in main.ts handles the full flow — entity spawn hooks into success path
- EntityProfile from recognition API provides name, archetype, traits, role for labels and tooltip
- Game world needs to be a separate view that persists entity state across draw/world switches

</code_context>

<specifics>
## Specific Ideas

- The player's drawing IS the entity — "your drawing comes alive" is the core magic. The entity sprite must be the actual drawing, not a placeholder.
- Transparent sprites so entities are floating drawings, not white rectangles on the canvas
- Proportional scaling preserves the "I drew it big so it's a big entity" feel while keeping the world manageable

</specifics>

<deferred>
## Deferred Ideas

- **Card-based entity system**: In the full multiplayer vision, drawings become playing cards that players can play at the beginning of rounds. Too complex for PoC — future milestone.
- **Timed drawing phases**: In multiplayer, all players draw simultaneously within a time limit, then all entities spawn together. PoC uses immediate spawn-on-recognition.
- **Entity removal / world clearing**: Not needed for PoC. Future milestone could add click-to-remove or round-based clearing.
- **Biome / terrain map**: Out of scope per PROJECT.md — plain flat canvas for PoC.

</deferred>

---

*Phase: 04-entity-spawn-rendering*
*Context gathered: 2026-04-07*
