# Phase 6: React Control Surface - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 moves the studio control surface from imperative DOM creation in the Pixi entrypoint into React-managed UI. This phase covers the main toolbar actions, brush thickness controls, draw/world mode switching, and lightweight status UI needed alongside those controls. It does not migrate recognition result/loading/error overlays yet; those belong to Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Control layout
- **D-01:** Keep the control surface as a compact top-centered toolbar rather than introducing a new sidebar or lobby-style studio frame in this phase.
- **D-02:** Preserve the current control density and action grouping so the migration validates React ownership without changing the user workflow.

### View toggle behavior
- **D-03:** Keep a single explicit Draw/World toggle button rather than introducing tabs, segmented controls, or a persistent split view.
- **D-04:** Preserve the current behavior where switching into world mode changes the toggle label and disables drawing-specific actions until the user returns to draw mode.

### Control state parity
- **D-05:** Keep the current enable/disable rules as the behavioral baseline: submit, clear, and undo depend on canvas emptiness; thickness controls disable when drawing is not available.
- **D-06:** Keyboard undo behavior remains available and should continue to target the drawing surface after the React migration.

### React boundary for this phase
- **D-07:** Phase 6 moves the toolbar controls into React and may also move the lightweight mock-mode badge so visible control/status UI is co-located.
- **D-08:** Recognition loading, result, and error overlays remain outside this phase and should be left for Phase 7.

### the agent's Discretion
- Exact React component boundaries within the toolbar
- Whether the mock-mode badge lives in the toolbar row or as a separate lightweight React element
- Styling cleanup required to preserve the existing visual feel while moving ownership to React

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` — Phase 6 goal, requirements, and success criteria
- `.planning/REQUIREMENTS.md` — UIM-01, UIM-03, and UIM-04 define the phase scope
- `.planning/PROJECT.md` — milestone goal and active constraints for React migration

### Existing client behavior
- `client/src/main.ts` — current imperative toolbar creation, button state rules, mode toggle logic, and keyboard undo wiring
- `client/src/style.css` — existing toolbar, thickness toggle, and related UI styling
- `client/src/drawing/DrawingCanvas.ts` — drawing state, undo stack, thickness updates, and canvas interaction model
- `client/src/world/WorldStage.ts` — draw/world visibility toggle behavior that the React controls must continue to drive
- `client/src/recognition/RecognitionOverlay.ts` — reference for what remains deferred to Phase 7 versus what lightweight status UI can be moved now

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/main.ts`: already contains the exact control actions and current enable/disable behavior to preserve while moving ownership to React
- `client/src/drawing/DrawingCanvas.ts`: exposes `undo()`, `clear()`, `setThickness()`, `isEmpty`, and `undoStack.onChange` for control-state integration
- `client/src/world/WorldStage.ts`: exposes `toggle()` and `inWorld` for mode switching without changing world logic

### Established Patterns
- Client UI controls are currently created imperatively with `document.createElement` and appended to `document.body`
- Drawing-specific controls disable when the world view is active
- The existing UI is intentionally lightweight and centered around fast access to the draw-to-life loop

### Integration Points
- The future React control surface must replace the toolbar creation block in `client/src/main.ts`
- React-owned controls must still call the same drawing and world actions already exposed in the client runtime
- React state will need a synchronization point for canvas emptiness, current mode, and selected thickness

</code_context>

<specifics>
## Specific Ideas

No specific visual references were requested. Standard approach is preferred: keep the current toolbar interaction model and migrate ownership first, redesign later.

</specifics>

<deferred>
## Deferred Ideas

- Full client shell or lobby restructuring in React — deferred to later phase/milestone work
- Recognition loading/result/error overlays — Phase 7
- Routing, global state library adoption, or broader app architecture cleanup — out of scope for Phase 6

</deferred>

---
*Phase: 06-react-control-surface*
*Context gathered: 2026-04-07*
