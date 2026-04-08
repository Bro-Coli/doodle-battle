# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Crayon World — a multiplayer browser game where players draw freehand and AI (Claude Haiku) brings drawings to life as autonomous entities. Currently a single-player proof of concept targeting a May 1, 2026 hackathon submission with a $100 Anthropic API budget.

## Commands

```bash
# Development (two terminals)
pnpm run dev:client    # Vite dev server on localhost:5173
pnpm run dev:server    # Express server on localhost:3001

# Tests
pnpm run test          # Vitest (server package)

# Install
pnpm install           # from root — uses pnpm workspaces
```

## Architecture

Monorepo with three pnpm workspace packages:

- **`client/`** — PixiJS v8 rendering, Vite bundler. Toolbar is HTML overlay (not PixiJS) for accessibility. Vite proxies `/api` to the server in dev.
- **`server/`** — Express v5 API proxy. Holds the Anthropic API key (never exposed to browser). Returns mock entities when `MOCK_AI=true` or API key is missing.
- **`shared/`** — TypeScript interfaces (`EntityProfile`, `Archetype`). No build step — consumed as raw `.ts` by both client and server via tsx/Vite.

### Key patterns

- **PixiJS v8:** Uses `new Application()` then `await app.init()` (not constructor options).
- **No top-level await** in client — wrap in async function to avoid Vite production build failures.
- **Named exports** preferred (e.g., `export function isMockMode()`) to avoid module cache issues with mocking.
- **Entity design:** Lightweight entity records with behavior dispatch, not full ECS. State is plain data (future Colyseus compatibility). Simulation is delta-time based. Behavior functions are pure.

## Environment

Copy `.env.example` to `.env`. Key variables:
- `MOCK_AI=true` — use hardcoded test entities instead of calling Claude
- `ANTHROPIC_API_KEY` — required for real AI recognition
- `PORT=3001` — server port

## TypeScript

Strict mode enabled. ES2022 target, bundler module resolution. Base config in `tsconfig.base.json`, extended by each package.

## Roadmap

Managed via GSD methodology in `.planning/`. Five phases:
1. ~~Infrastructure~~ (complete)
2. Drawing Canvas — freehand input, smooth strokes, undo, clear
3. Recognition Pipeline — Claude Haiku sketch recognition
4. Entity Spawn & Rendering
5. Entity Simulation — 6 archetypes (walking, flying, rooted, spreading, drifting, stationary)
