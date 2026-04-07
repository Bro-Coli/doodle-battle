# Phase 3: Recognition Pipeline - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Submit the drawing PNG to Claude Haiku via the Express API proxy, receive a validated entity profile, with visible loading state and graceful error handling. Cache results by entity name. No entity spawning or rendering — just the recognition pipeline and result display.

</domain>

<decisions>
## Implementation Decisions

### Loading & feedback
- Simple centered spinner on the drawing region while waiting for Claude
- Drawing stays visible during recognition (do NOT clear on submit — changed from Phase 2 behavior)
- All toolbar buttons disabled during recognition (Submit, Clear, Undo, thickness)
- Soft timeout at 10 seconds shows "Taking longer than expected..." message, hard timeout at 30 seconds

### Error & fallback behavior
- Unrecognized drawings spawn a "Mystery Blob" entity with random archetype — always return something
- API failures: auto-retry once silently, then show error + manual retry button if second attempt fails
- Error messages appear as a toast/banner above the drawing region — non-blocking, dismissable
- Drawing stays on canvas during errors so player can retry or modify
- Subtle "Mock Mode" badge visible in corner when running without API key

### Recognition result display
- Card popup showing full EntityProfile: name, archetype, traits list, and role
- Card auto-dismisses after ~5 seconds, player can also click to dismiss early
- Canvas clears when the card dismisses (not when it appears) — drawing stays visible during the "reveal" moment
- Toolbar re-enables after card dismisses

### Prompt & response design
- Open vocabulary — Claude names whatever it sees, no restrictions or guided categories
- Unknown archetypes map to "stationary" as the safe default
- Strict JSON prompt with server-side validation against EntityProfile schema
- Malformed JSON returns a fallback mystery entity (same as unrecognized)
- Cache recognition results by entity name — reuse cached behavior profiles for repeated entities to save API costs

### Claude's Discretion
- Exact Claude Haiku prompt wording and system message
- Spinner animation style
- Card popup visual design and positioning
- Cache implementation details (in-memory map is fine for PoC)
- Toast/banner styling and animation
- Mock mode badge styling and position
- Retry delay timing

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/routes/recognize.ts`: POST route with mock mode branching already in place — real Anthropic call replaces the 501 placeholder
- `server/src/mock-entities.ts`: 6 mock entities covering all archetypes — reusable as fallback pool
- `client/src/main.ts:66-71`: Submit handler exports PNG as data URL — needs to POST to `/api/recognize` instead of console.log
- `client/src/drawing/exportPng.ts`: Returns PNG data URL ready to send as base64
- `shared/src/types.ts`: EntityProfile and Archetype types already defined

### Established Patterns
- HTML overlay for UI (not PixiJS) — loading spinner, result card, and error toasts should follow this pattern
- Toolbar button enable/disable via `drawingCanvas.undoStack.onChange` callback
- Vite proxies `/api` to server in dev — client can POST directly to `/api/recognize`
- Named exports preferred (e.g., `isMockMode()`)

### Integration Points
- Client submit handler → POST PNG data URL to `/api/recognize`
- Server recognize route → Anthropic SDK with Claude Haiku vision
- Server validates response → returns typed EntityProfile to client
- Client receives profile → displays card popup → clears canvas on dismiss
- Phase 2's auto-clear on submit needs to be deferred to after card dismiss

</code_context>

<specifics>
## Specific Ideas

- The card popup showing the full profile is the "reveal moment" — drawing stays visible while the card shows what Claude recognized. This is a key UX beat: "Your drawing became a Wolf!"
- Mystery Blob for unrecognized drawings keeps the game fun — there's no "failure" state, just unexpected entities
- Cache by entity name because the concept doc says "The AI does the hard work once at spawn"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-recognition-pipeline*
*Context gathered: 2026-04-07*
