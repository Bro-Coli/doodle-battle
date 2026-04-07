# Architecture Research

**Domain:** Browser-based 2D game with AI integration and entity simulation
**Project:** Crayon World
**Researched:** 2026-04-07

---

## Recommended Pattern

**Lightweight entity records with behavior dispatch** — not full ECS.

Full Entity Component System (like bitECS or ECSY) is overkill for this project. Entities are simple data records with a behavior archetype that drives a movement function. The AI does the complex work once at spawn; the game loop runs simple rules per frame.

```typescript
// Entity is just data
interface Entity {
  id: string;
  identity: string;        // "wolf", "bird", "oak tree"
  archetype: Archetype;    // "walking" | "flying" | "rooted" | "spreading" | "drifting" | "stationary"
  team: Team;
  x: number;
  y: number;
  speed: number;
  health: number;
  traits: string[];
  hostileTo: string[];
  symbiosis: string[];
}

// Behavior is a pure function
type BehaviorFn = (entity: Entity, world: WorldState, dt: number) => void;

// Dispatch by archetype
const behaviors: Record<Archetype, BehaviorFn> = {
  walking: walkingBehavior,
  flying: flyingBehavior,
  rooted: rootedBehavior,
  spreading: spreadingBehavior,
  drifting: driftingBehavior,
  stationary: stationaryBehavior,
};
```

**Why not full ECS:** Only 6 behavior types. Entities don't gain/lose components at runtime. The complexity budget is better spent on the AI pipeline.

---

## Component Boundaries

| Component | Responsibility | Talks To | Direction |
|-----------|---------------|----------|-----------|
| **DrawingCanvas** | Capture freehand input, render strokes, export PNG | → AIService | Sends PNG on submit |
| **AIService** | Call Claude API (proxy), cache results, return profiles | ← DrawingCanvas, → EntityManager | Receives PNG, returns EntityProfile |
| **EntityManager** | Create/destroy entities, maintain entity list | ← AIService, → Simulation | Receives profiles, provides entity list |
| **Simulation** | Run behavior functions each frame, update positions | ← EntityManager, → Renderer | Reads entities, writes positions |
| **Renderer** | Draw entities on PixiJS stage, update sprites | ← Simulation | Reads entity positions |
| **APIProxy (server)** | Hold API key, forward requests to Claude | ← AIService (HTTP) | Receives recognition requests |

---

## Data Flow

```
Player draws on canvas
        │
        ▼
  DrawingCanvas captures strokes (PixiJS Graphics)
        │
        ▼ (submit button pressed)
  Canvas exported as PNG (renderer.extract.canvas())
        │
        ▼
  AIService sends PNG to APIProxy server
        │
        ▼
  APIProxy calls Claude Haiku vision API
        │
        ▼
  Returns entity label (e.g., "wolf")
        │
        ▼
  AIService calls Claude Haiku for behavior profile
  (label + scenario context → structured JSON)
        │
        ▼ (cached by label for future calls)
  EntityManager creates Entity from profile
        │
        ▼
  Simulation.update() called each frame via PixiJS Ticker
        │
        ▼
  behavior[entity.archetype](entity, world, dt)
        │
        ▼
  Renderer updates sprite positions from entity state
```

---

## Game Loop Architecture

```typescript
// PixiJS Ticker drives the loop
app.ticker.add((ticker) => {
  const dt = ticker.deltaMS / 1000; // seconds

  // Update all entities
  for (const entity of entityManager.entities) {
    behaviors[entity.archetype](entity, world, dt);
  }

  // Update renderer (sprite positions match entity positions)
  renderer.sync(entityManager.entities);
});
```

**Key principle:** Simulation uses `dt` (delta time), never frame count. This prevents speed varying with frame rate.

---

## Client/Server Separation for Multiplayer Readiness

**PoC architecture:**
```
Browser ←→ API Proxy Server (Express/Hono)
                 │
                 ▼
           Claude API
```

**Future multiplayer architecture:**
```
Browser ←→ Colyseus Game Server
                 │
           ┌─────┴─────┐
           │            │
     Simulation    Claude API
     (authoritative)
```

**Rules to follow now that make multiplayer migration easy:**

1. **Entity state is plain data** — no class instances with methods. Just interfaces in `shared/types.ts`.
2. **Simulation is a pure function** — `updateEntity(entity, world, dt)` takes data in, returns data out. No side effects, no DOM access.
3. **Renderer reads, never writes entity state** — one-way data flow from simulation → renderer.
4. **AI calls go through the server** — already required for API key security. Same endpoint works from Colyseus.
5. **Don't store game state in PixiJS objects** — PixiJS sprites are rendering-only. Entity truth lives in the entity list.

---

## Suggested Build Order

| Order | Component | Dependencies | Parallelizable? |
|-------|-----------|-------------|-----------------|
| 1 | Project scaffolding (Vite + PixiJS + TypeScript) | None | — |
| 2 | DrawingCanvas (freehand input + stroke rendering) | Scaffolding | — |
| 3 | PNG export + AIService + APIProxy | Scaffolding | Yes (with #2) |
| 4 | EntityManager + Renderer (spawn entities on canvas) | #2, #3 | — |
| 5 | Simulation (6 archetype behaviors) | #4 | — |
| 6 | Polish (labels, loading indicator, clear button, error handling) | #5 | — |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Dangerous | Do This Instead |
|-------------|---------------|-----------------|
| **Store entity state in PixiJS sprites** | Can't serialize for multiplayer, can't run headless tests | Entity data in plain objects, sprites are views |
| **Call Claude API from browser** | Exposes API key | Always proxy through server |
| **Couple simulation to frame rate** | Different devices = different game speeds | Use `dt` (delta time) everywhere |
| **Build ECS framework first** | Over-engineering for 6 archetypes | Simple record + dispatch map |
| **AI calls block the game loop** | Freezes UI during recognition | Async calls with loading state, spawn when ready |

---

*Architecture research: 2026-04-07*
