# Stack Research

**Domain:** AI-powered drawing browser game with entity simulation
**Project:** Crayon World
**Researched:** 2026-04-07

---

## Recommended Stack

| Layer | Choice | Version | Confidence | Rationale |
|-------|--------|---------|------------|-----------|
| **Renderer** | PixiJS | v8.x | High | GPU-accelerated 2D, WebGPU-ready, tiny bundle, instant load. Built-in canvas export via `app.renderer.extract` for the AI pipeline. |
| **Language** | TypeScript | 5.4+ | High | Shared types between client and future Colyseus server. Type safety for entity profiles and behavior system. |
| **Build** | Vite | 6.x | High | Fast HMR critical for 3-week hackathon pace. Native TS support, zero config for PixiJS. |
| **Drawing quality** | perfect-freehand | 1.x | Medium | Converts raw pointer events to pressure-sensitive, tapered strokes. Makes crude mouse input look hand-drawn. Small library, no dependencies. |
| **AI SDK** | @anthropic-ai/sdk | Latest | High | Official TypeScript SDK. Vision API support for sending canvas PNGs. Streaming optional. |
| **AI Model** | Claude Haiku 4.5 | — | High | Best sketch understanding at lowest cost. $100 credits available. ~$0.0001/call. |
| **API Proxy** | Express or Hono | — | High | **Mandatory** — keeps Anthropic API key off the browser. Single file, minimal setup. Hono is lighter but Express has more examples. |
| **Cache** | In-memory Map | — | High | Cache recognition results by entity label. Zero dependencies for PoC. Move to Redis if needed for multiplayer. |
| **Testing** | Vitest | 3.x | Medium | Same config as Vite, zero extra setup. Use for unit testing entity behavior logic. |
| **Multiplayer (deferred)** | Colyseus | 0.15.x | High | Purpose-built game server, schema-based sync. Architecture entity state as plain TS interfaces now — Colyseus Schema decorators map onto these later. |

---

## Project Structure

```
crayon-world/
├── client/                  # PixiJS frontend
│   ├── src/
│   │   ├── main.ts          # Entry point, PixiJS app init
│   │   ├── canvas/          # Drawing input, stroke rendering
│   │   ├── entities/        # Entity rendering, sprite management
│   │   ├── ai/              # API client for recognition calls
│   │   └── ui/              # HUD, buttons, labels
│   ├── index.html
│   └── vite.config.ts
├── server/                  # API proxy + future game server
│   ├── src/
│   │   ├── index.ts         # Express/Hono server
│   │   ├── recognition.ts   # Claude API calls
│   │   ├── cache.ts         # Entity label cache
│   │   └── profiles.ts      # Behavior profile generation
│   └── tsconfig.json
├── shared/                  # Shared types (client + server)
│   └── types.ts             # EntityProfile, Archetype, etc.
├── package.json
└── tsconfig.base.json
```

**Why client/server/shared split:** Even for PoC, this separation means Colyseus slots into `server/` without restructuring. Shared types ensure entity profiles are consistent across the wire.

---

## What NOT to Use

| Rejected | Why |
|----------|-----|
| **Phaser** | Heavier than needed. PixiJS gives rendering without opinionated game framework. We need custom entity behavior, not Phaser's physics/scene system. |
| **Three.js** | 3D renderer. Overkill for 2D canvas drawing game. |
| **Canvas 2D API directly** | No GPU acceleration. PixiJS abstracts this and gives WebGPU path. |
| **Box2D / Matter.js** | Full physics conflicts with archetype-based movement. Entities follow AI-derived behavior, not physics simulation. |
| **Socket.io** | For multiplayer phase, Colyseus is purpose-built for games with schema sync. Socket.io is generic messaging. |
| **Next.js / React** | No need for SSR or component framework. This is a game, not a web app. Vanilla TS + PixiJS is lighter and faster. |
| **AI image generation** | DALL-E/Stable Diffusion for entity sprites is too slow (seconds per call) and too expensive. Use simple shapes/sprites keyed to archetypes. |

---

## Key Dependencies (package.json)

```json
{
  "dependencies": {
    "pixi.js": "^8.0.0",
    "perfect-freehand": "^1.2.0",
    "@anthropic-ai/sdk": "^0.39.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

---

## Configuration Notes

- **Environment:** Single `.env` file for `ANTHROPIC_API_KEY`. Server-side only — never bundled into client.
- **Monorepo:** Use TypeScript project references or simple workspaces. Keep it simple for hackathon — a flat structure with `client/` and `server/` folders sharing `shared/` types is sufficient.
- **Dev workflow:** `vite dev` for client, `tsx watch server/src/index.ts` for server. Two terminals or `concurrently`.

---

*Stack research: 2026-04-07*
