# Phase 2: Drawing Canvas - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Freehand drawing on a bounded canvas region with smooth tapered strokes, multi-level undo, instant clear, and PNG export cropped to content. Mouse-first input. No color picker, no AI integration, no entity rendering — just the drawing tool.

</domain>

<decisions>
## Implementation Decisions

### Stroke appearance
- Black only — no color picker (color deferred to polish phase)
- 2-3 preset thickness sizes (thin/medium/thick toggle in toolbar)
- Smooth, tapered stroke ends — thinner at start/end, like a real pen
- Moderate curve smoothing — smooth out jitters but keep intentional curves

### Drawing interaction
- Mouse-first optimization; touch works as fallback but not the priority
- Bounded drawing region — centered card/frame with subtle border or shadow, like drawing on a piece of paper
- Toolbar and UI live outside the drawing region
- Crosshair cursor inside the drawing area

### Undo & clear behavior
- Full undo stack — undo removes strokes one at a time, can undo back to blank canvas
- Ctrl+Z keyboard shortcut for undo; no shortcut for clear (button only)
- Instant clear — no confirmation dialog
- Submit clears the canvas automatically after export, ready for next drawing

### PNG export
- White background included (black on white, matches screen)
- Crop to drawing content bounding box with padding
- Submit button disabled when canvas is empty (no strokes) — prevents blank submissions

### Claude's Discretion
- Max resolution cap for exported PNG (balance detail vs API cost)
- Exact stroke smoothing algorithm
- Exact padding amount around cropped content
- Drawing region dimensions and responsive behavior
- Thickness preset values (exact pixel sizes)
- Toolbar layout for thickness toggle

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/main.ts`: PixiJS Application initialized with `resizeTo: window`, white background — drawing region will be rendered inside this
- `client/src/main.ts`: Toolbar buttons (Submit, Clear, Undo) already created as HTML overlay — need event handlers and enabled states
- `client/src/style.css`: Toolbar styling complete with disabled state styles — need active/enabled button styles

### Established Patterns
- PixiJS v8: `new Application()` then `await app.init()` — drawing must follow this pattern
- No top-level await — all async code wrapped in `init()` function
- HTML overlay for UI (not PixiJS) — thickness toggle should follow this pattern
- Toolbar is centered, fixed position with glass-morphic styling

### Integration Points
- Drawing strokes rendered as PixiJS Graphics on the app stage
- PNG export via PixiJS renderer extract (captures stage content as image)
- Submit button will eventually POST to `/api/recognize` (Phase 3) — Phase 2 just exports the PNG
- Stroke data stored as array of point arrays for undo stack

</code_context>

<specifics>
## Specific Ideas

- Drawing region should feel like a centered card/frame — "like drawing on a piece of paper"
- After submitting, canvas clears automatically so the player is ready to draw again immediately
- Toolbar buttons enable/disable based on canvas state (Submit/Clear/Undo disabled when empty)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-drawing-canvas*
*Context gathered: 2026-04-07*
