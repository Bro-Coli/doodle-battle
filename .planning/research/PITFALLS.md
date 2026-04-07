# Pitfalls Research

**Domain:** Browser-based 2D game with AI integration
**Project:** Crayon World
**Researched:** 2026-04-07

---

## Critical Pitfalls

### 1. Canvas Export Blocks the Main Thread

**Risk:** High | **Phase:** Drawing Canvas + Recognition Pipeline

Calling `renderer.extract.canvas()` or `.toDataURL()` on a PixiJS canvas can block the main thread for 50-200ms on complex drawings. During a timed draw phase, this causes visible stuttering.

- **Warning signs:** Frame drops when submitting drawing, "jank" during export
- **Prevention:** Export on a `requestIdleCallback` or `setTimeout(0)`. Crop to bounding box of strokes (not full canvas). Keep export resolution reasonable (512x512 max for Haiku).
- **Phase:** Address in drawing canvas implementation

### 2. AI API Latency Perceived as Broken

**Risk:** High | **Phase:** Recognition Pipeline

Claude Haiku calls take 0.5–3 seconds. Without feedback, users think the app crashed or their drawing wasn't received. This is the #1 UX failure in AI-integrated apps.

- **Warning signs:** Users clicking submit repeatedly, confusion after drawing
- **Prevention:** Show immediate feedback ("AI is thinking..."), progress indicator, maybe even stream the recognition label letter-by-letter for drama. Never leave the user in a state with no visual change after clicking submit.
- **Phase:** Address in recognition pipeline, polish in UI phase

### 3. API Key Exposed in Browser Bundle

**Risk:** Critical | **Phase:** Project scaffolding

If the Anthropic API key ends up in client-side code (even via Vite's `import.meta.env`), it's exposed in the browser's network tab. Anyone can steal it and burn through the $100 credit.

- **Warning signs:** API calls visible in browser DevTools network tab going directly to `api.anthropic.com`
- **Prevention:** **All** Claude API calls go through a server-side proxy. Client calls `POST /api/recognize` on your server. Server holds the key. No exceptions.
- **Phase:** Address in project scaffolding — server must exist from day one

### 4. Frame-Rate-Coupled Simulation

**Risk:** Medium | **Phase:** Entity Simulation

If entity movement uses `x += speed` per frame instead of `x += speed * dt`, entities move faster on 144Hz monitors and slower on 30fps phones. The game plays differently on every device.

- **Warning signs:** Entities move at different speeds on different machines, simulation feels "off" on phones
- **Prevention:** Always multiply by delta time (`dt`). PixiJS Ticker provides `ticker.deltaMS`. Use `dt = ticker.deltaMS / 1000` for seconds-based movement.
- **Phase:** Address in entity simulation from the start

### 5. PixiJS Texture/Memory Leaks

**Risk:** Medium | **Phase:** Entity Rendering

Every time a new entity spawns, if you create new PixiJS textures or Graphics objects without cleaning up, memory grows unbounded. With multiple entities across multiple drawings, this adds up fast.

- **Warning signs:** Increasing memory in DevTools over time, page gets sluggish after many spawns
- **Prevention:** Reuse sprite textures for same archetypes. Destroy old Graphics objects when clearing the drawing canvas. Use `texture.destroy()` when removing entities. Pool sprites if entity count gets high.
- **Phase:** Address in entity rendering implementation

### 6. CORS Failures Between Client and Server

**Risk:** Medium | **Phase:** Project Scaffolding

Vite dev server runs on one port, Express/Hono on another. Without CORS configuration, every API call fails with an opaque error.

- **Warning signs:** `CORS policy` errors in browser console, API calls silently failing
- **Prevention:** Configure Vite proxy in development (`vite.config.ts` → `server.proxy`). Add CORS middleware on Express/Hono for production. Test this immediately after scaffolding.
- **Phase:** Address in project scaffolding

### 7. No Development Mode Without API Calls

**Risk:** High | **Phase:** Recognition Pipeline

During development, every test of the draw→spawn loop burns an API call. At 50+ iterations per day, costs add up and slow iteration speed.

- **Warning signs:** API credit depleting during development, slow iteration on behavior tuning
- **Prevention:** Build a mock mode from day one. Hard-code 5-10 common entity profiles (wolf, bird, tree, fish, fire). Environment variable `MOCK_AI=true` returns cached profiles instantly. Only use real API for integration testing and demos.
- **Phase:** Address in recognition pipeline implementation

### 8. Overscoping Entity Behavior

**Risk:** High | **Phase:** Entity Simulation

Temptation to make each archetype increasingly complex (pathfinding, flocking, state machines). This consumes the entire hackathon timeline on one system.

- **Warning signs:** Spending more than 2 days on entity behavior, adding "just one more" behavior feature
- **Prevention:** Each archetype is one function, <50 lines. Walking: move toward nearest point of interest at fixed speed. Flying: same but ignores y-axis constraints. Rooted: don't move, grow radius. Simple rules create emergent-looking behavior.
- **Phase:** Enforce during entity simulation — set a hard time box

### 9. Drawing Canvas Doesn't Feel Good

**Risk:** Medium | **Phase:** Drawing Canvas

Raw mouse/touch events produce jagged, unsatisfying lines. If drawing feels bad, the entire experience suffers — players won't want to draw.

- **Warning signs:** Lines look pixelated/jagged, no stroke variation, drawing feels "off"
- **Prevention:** Use `perfect-freehand` library for smooth, pressure-sensitive-looking strokes from raw pointer events. This single dependency transforms the drawing experience.
- **Phase:** Address in drawing canvas implementation

### 10. Trying to Recognize Mid-Stroke

**Risk:** Medium | **Phase:** Recognition Pipeline

The concept doc mentions "recognition fires the moment a stroke is lifted" for the full game. For PoC, this creates unnecessary complexity — partial drawing recognition, multiple API calls, reconciliation logic.

- **Warning signs:** Multiple rapid API calls, flickering entity labels, wasted credits on incomplete drawings
- **Prevention:** For PoC, use an explicit "Submit" button. One drawing → one API call → one entity. The real-time recognition pipeline is a multiplayer-phase optimization.
- **Phase:** Simplify in PoC, revisit for multiplayer

### 11. Entity Spawns on Top of Drawing

**Risk:** Low | **Phase:** Entity Rendering

If entities spawn at the center of the drawing area, they overlap with the player's strokes. Visually confusing.

- **Warning signs:** Can't distinguish entity from drawing, cluttered canvas
- **Prevention:** Clear the drawing strokes after submission (or fade them). Spawn entity at the drawing's centroid position. Separate drawing layer from entity layer in PixiJS (two Containers).
- **Phase:** Address in entity rendering

### 12. Scope Creep into Multiplayer During PoC

**Risk:** High | **Phase:** All

The concept doc's multiplayer architecture is compelling. Temptation to "just set up Colyseus real quick" during PoC week will derail the timeline.

- **Warning signs:** Installing Colyseus, setting up Railway, thinking about rooms
- **Prevention:** The PoC proves draw→AI→spawn→behave. Multiplayer is milestone 2. Follow the client/server separation rules so migration is easy later, but don't build the multiplayer infrastructure now.
- **Phase:** Resist throughout PoC

### 13. AI Returns Inconsistent Profile Formats

**Risk:** Medium | **Phase:** Recognition Pipeline

Claude Haiku generating JSON profiles may occasionally return malformed JSON, unexpected fields, or inconsistent archetype names.

- **Warning signs:** Runtime errors on entity spawn, `undefined` archetype, JSON parse failures
- **Prevention:** Validate AI response with a Zod schema or equivalent. Map unrecognized archetypes to a default ("walking"). Wrap profile generation in try/catch with fallback to a generic entity.
- **Phase:** Address in recognition pipeline

### 14. Not Testing with Bad Drawings

**Risk:** Medium | **Phase:** Integration Testing

Developers test with neat, recognizable drawings. Real users draw abstract scribbles, stick figures, and half-finished shapes.

- **Warning signs:** Demo works perfectly, real users get constant recognition failures
- **Prevention:** Test with intentionally bad drawings during development. Build a graceful fallback: unrecognized drawings become "mysterious creature" with random archetype. The game should never feel broken — just funny.
- **Phase:** Address in polish phase

---

## Pitfall Priority Matrix

| Priority | Pitfall | When to Address |
|----------|---------|-----------------|
| P0 | API key exposure (#3) | Project scaffolding — day 1 |
| P0 | No dev mock mode (#7) | Recognition pipeline — day 1 of AI work |
| P1 | AI latency UX (#2) | Recognition pipeline |
| P1 | Frame-rate coupling (#4) | Entity simulation — first line of code |
| P1 | Scope creep (#12) | Ongoing discipline |
| P1 | Overscoping behavior (#8) | Entity simulation — set time box |
| P2 | Canvas export blocking (#1) | Drawing canvas |
| P2 | Drawing feel (#9) | Drawing canvas |
| P2 | CORS setup (#6) | Scaffolding |
| P2 | Inconsistent AI profiles (#13) | Recognition pipeline |
| P3 | Texture leaks (#5) | Entity rendering |
| P3 | Spawn overlap (#11) | Entity rendering |
| P3 | Bad drawing testing (#14) | Polish phase |
| P3 | Mid-stroke recognition (#10) | Defer to multiplayer |

---

*Pitfalls research: 2026-04-07*
