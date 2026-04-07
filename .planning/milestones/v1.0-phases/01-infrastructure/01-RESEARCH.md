# Phase 1: Infrastructure - Research

**Researched:** 2026-04-07
**Domain:** pnpm monorepo, TypeScript, Vite, PixiJS v8, Express API proxy
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full viewport canvas — takes the entire browser window, immersive game feel
- White/light background — clean paper feel, drawings will stand out
- Black stroke color (for when drawing is implemented in Phase 2)
- Toolbar visible from start — Submit, Clear, Undo buttons ready before first stroke (disabled until drawing exists)
- 6 hardcoded mock entities, one per archetype: Wolf (walking), Eagle (flying), Oak (rooted), Fire (spreading), Cloud (drifting), Rock (stationary)
- Mock mode activates automatically when ANTHROPIC_API_KEY is missing (zero config for new devs)
- Explicit MOCK_AI=true env var also available to force mock even when key is present
- Mock returns random entity from pool — no attempt to match drawing content
- pnpm as package manager
- pnpm workspaces for monorepo: three packages — client/, server/, shared/
- Express for API proxy server
- Two-terminal dev workflow: separate terminals for client (vite dev) and server (tsx watch)
- Vite for client bundling

### Claude's Discretion
- Express route structure and middleware setup
- CORS configuration approach
- TypeScript config (tsconfig paths, project references)
- Exact toolbar button styling and positioning
- .env file structure

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Server-side API proxy keeps Anthropic API key secure | Express server with dotenv + ANTHROPIC_API_KEY never bundled into client; key loaded only on server process |
| INFR-02 | Mock AI mode for development (hardcoded profiles, no API calls) | MOCK_AI env var + auto-detect missing key; 6 hardcoded EntityProfile objects in server/src/mock-entities.ts |
| INFR-03 | Browser-accessible with no login or install required | Vite dev server on localhost; static HTML entry with pixi.js canvas; zero auth middleware |
</phase_requirements>

---

## Summary

This phase scaffolds a greenfield pnpm workspace monorepo with three packages: `client/` (Vite + PixiJS), `server/` (Express + tsx), and `shared/` (TypeScript types). The primary technical work is wiring these three packages together so they share types at development time without a compile step, the Express server proxies future Anthropic calls with the API key stored server-side only, and the PixiJS canvas fills the browser viewport on first load.

The stack is well-established and heavily documented. PixiJS v8 introduced a mandatory async `init()` pattern (breaking from v7) that must be respected — trying to use top-level `await` directly with Vite's production build causes failures. The shared package approach is straightforward: because there is no build step for `shared/`, the client and server import raw `.ts` source files directly, which tsx and Vite both handle natively.

Mock mode is trivially implemented: the server checks `process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY` and returns a random item from a hardcoded array instead of calling Anthropic. This requires no external dependencies beyond what is already in the stack.

**Primary recommendation:** Scaffold with `pnpm init` at root, create `pnpm-workspace.yaml` listing `client`, `server`, `shared`, add `workspace:*` cross-references in package.json files, and configure Vite's dev proxy to forward `/api/*` to the Express server on port 3001.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 9.x (install globally) | Package manager + workspace orchestration | Required by locked decision; content-addressable store, fastest installs |
| TypeScript | 5.x | Language; shared types between client and server | Required by locked decision; project references enable per-package isolation |
| pixi.js | 8.16.0 (latest v8) | 2D canvas rendering | Required by project; GPU-accelerated, tiny bundle, supports WebGL + WebGPU |
| vite | 8.x | Client dev server + bundler | Required by locked decision; fastest HMR, native ESM, built-in proxy |
| express | 5.2.x | HTTP API proxy server | Required by locked decision; v5 is now the npm default (published Oct 2024) |
| tsx | latest | Run TypeScript server without compile step | Required by locked decision for `tsx watch` dev workflow |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cors | 2.8.x | Express CORS middleware | Required to allow client (port 5173) to call server (port 3001) in dev |
| @types/express | 5.x | TypeScript types for Express | Required when using Express v5 with TypeScript |
| @types/cors | 2.x | TypeScript types for cors package | Required for typed CORS options |
| dotenv | 16.x | Load .env into process.env | Load ANTHROPIC_API_KEY and MOCK_AI on server only — never on client |
| vitest | 4.x | Unit testing | nyquist_validation is enabled; test mock entity logic and shared types |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsx watch | ts-node + nodemon | tsx is simpler — one tool, no config, faster (uses esbuild under the hood) |
| Express v5 | Fastify | Express is locked decision; Fastify would be faster but is not decided |
| Vite proxy | http-proxy-middleware in server | Vite proxy is dev-only and simpler; prod would need a real reverse proxy anyway |

**Installation (run from repo root):**
```bash
# Root
pnpm init

# Packages
mkdir client server shared
cd client && pnpm init && cd ..
cd server && pnpm init && cd ..
cd shared && pnpm init && cd ..

# Client deps
pnpm --filter client add pixi.js
pnpm --filter client add -D vite typescript vitest

# Server deps
pnpm --filter server add express cors dotenv
pnpm --filter server add -D tsx typescript @types/express @types/cors @types/node vitest

# Shared deps
pnpm --filter shared add -D typescript

# Link shared into client and server
pnpm --filter client add @crayon-world/shared@workspace:*
pnpm --filter server add @crayon-world/shared@workspace:*
```

---

## Architecture Patterns

### Recommended Project Structure

```
/                          # repo root
├── pnpm-workspace.yaml    # workspace config
├── package.json           # root scripts (dev, build)
├── tsconfig.base.json     # shared TS compiler options
├── .env                   # ANTHROPIC_API_KEY, MOCK_AI (server reads, never bundled)
├── .gitignore             # includes .env
├── client/
│   ├── package.json
│   ├── tsconfig.json      # extends tsconfig.base.json
│   ├── vite.config.ts     # proxy /api → localhost:3001
│   ├── index.html         # entry point, no framework
│   └── src/
│       └── main.ts        # PixiJS Application init
├── server/
│   ├── package.json
│   ├── tsconfig.json      # extends tsconfig.base.json
│   └── src/
│       ├── index.ts       # Express app entrypoint
│       ├── routes/
│       │   └── recognize.ts  # POST /api/recognize
│       └── mock-entities.ts  # 6 hardcoded EntityProfile objects
└── shared/
    ├── package.json
    └── src/
        └── types.ts       # EntityProfile, Archetype, etc.
```

### Pattern 1: pnpm Workspace Setup

**What:** Root `pnpm-workspace.yaml` declares the three packages; cross-package deps use `workspace:*` protocol.
**When to use:** Always — this is the monorepo foundation.
**Example:**
```yaml
# pnpm-workspace.yaml
packages:
  - "client"
  - "server"
  - "shared"
```

```json
// server/package.json (excerpt)
{
  "name": "@crayon-world/server",
  "dependencies": {
    "@crayon-world/shared": "workspace:*"
  }
}
```

### Pattern 2: Shared Types Without a Build Step

**What:** The `shared` package has no build step. Client and server import raw `.ts` files. This works because Vite and tsx both transform TypeScript natively at dev time.
**When to use:** Development only; production build compiles everything.
**Example:**
```json
// shared/package.json
{
  "name": "@crayon-world/shared",
  "main": "./src/types.ts",
  "types": "./src/types.ts"
}
```

```typescript
// server/src/index.ts
import type { EntityProfile } from '@crayon-world/shared';
```

### Pattern 3: PixiJS v8 Async Initialization

**What:** PixiJS v8 requires `await app.init()` — the constructor no longer accepts options. Must be wrapped in an async function, not top-level await, due to a Vite production build issue with top-level await (affects Vite <= 6.0.6; Vite 8 may resolve this but defensive wrapping is still the documented recommendation).
**When to use:** Every PixiJS app entry point.
**Example:**
```typescript
// Source: https://pixijs.com/8.x/guides/components/application
import { Application } from 'pixi.js';

async function init() {
  const app = new Application();
  await app.init({
    resizeTo: window,       // full viewport
    autoDensity: true,      // correct DPR scaling
    background: '#FFFFFF',  // white paper feel
  });
  document.body.appendChild(app.canvas);
}

init();
```

### Pattern 4: Express Mock Proxy Route

**What:** Single POST route `/api/recognize` that checks env vars and returns mock data or proxies to Anthropic.
**When to use:** This is the entire server in Phase 1.
**Example:**
```typescript
// server/src/routes/recognize.ts
import { Router } from 'express';
import type { EntityProfile } from '@crayon-world/shared';
import { MOCK_ENTITIES } from '../mock-entities';

const router = Router();

const isMockMode =
  process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY;

router.post('/', async (_req, res) => {
  if (isMockMode) {
    const entity = MOCK_ENTITIES[Math.floor(Math.random() * MOCK_ENTITIES.length)];
    res.json(entity satisfies EntityProfile);
    return;
  }
  // Phase 3: real Anthropic call goes here
  res.status(501).json({ error: 'Real AI not implemented yet' });
});

export default router;
```

### Pattern 5: Vite Dev Proxy

**What:** Vite's `server.proxy` forwards `/api/*` calls from the client to the Express server. Eliminates CORS issues in development. This proxy only works during `vite dev` — not in the production build.
**When to use:** Required in `vite.config.ts` to wire client → server in dev.
**Example:**
```typescript
// Source: https://vite.dev/config/server-options
// client/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

### Pattern 6: Environment Variable Security

**What:** `.env` at repo root loaded by the Express server with `dotenv`. The client bundle never contains `ANTHROPIC_API_KEY` because Vite only exposes env vars prefixed with `VITE_` to the client, and the key must not have that prefix.
**When to use:** Standard for all API key management.
**Example:**
```bash
# .env (never commit to git)
ANTHROPIC_API_KEY=sk-ant-xxxxx
MOCK_AI=false             # set true to force mock even if key is present
PORT=3001
```

```typescript
// server/src/index.ts
import 'dotenv/config';   // loads .env before anything else
import express from 'express';
```

### Anti-Patterns to Avoid

- **Top-level await in PixiJS entry:** Causes silent production build failures in older Vite. Always wrap in `async function init()`.
- **Prefixing ANTHROPIC_API_KEY with VITE_:** Vite will bundle it into the client bundle, exposing the key publicly.
- **Installing shared package deps without workspace: protocol:** Using `file:` paths instead of `workspace:*` breaks pnpm's dependency resolution.
- **Running both client and server from one terminal:** The locked decision requires two separate terminals; mixing them makes it harder to distinguish logs and restart independently.
- **Calling `dotenv.config()` in shared or client packages:** dotenv belongs only on the server.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript watch + restart | Custom file watcher + child_process restart | `tsx watch src/index.ts` | tsx handles ESM/CJS, path mapping, and restart atomically |
| Cross-origin requests in dev | Manual CORS headers on every Express response | `cors` middleware + Vite proxy | CORS headers have many edge cases (preflight, credentials, methods) |
| API key from env | Custom env file parser | `dotenv` | Handles quoting, comments, multiline values, encoding edge cases |
| Canvas resize | Manual `window.addEventListener('resize', ...)` + canvas style | `resizeTo: window` + `autoDensity: true` in PixiJS init | PixiJS handles DPR scaling and renderer resize internally |
| Workspace symlinks | Manual `npm link` | `workspace:*` in pnpm | pnpm automates symlinking; `npm link` breaks when paths change |

**Key insight:** The entire server in Phase 1 is fewer than 60 lines. Don't over-engineer the proxy — it exists only to hold the API key server-side. The full AI call doesn't happen until Phase 3.

---

## Common Pitfalls

### Pitfall 1: PixiJS Top-Level Await in Vite Production Build

**What goes wrong:** Using `await app.init()` at the module top level causes the Vite production build to fail silently or emit a broken bundle.
**Why it happens:** Vite's esbuild step doesn't handle top-level await in all target environments.
**How to avoid:** Always wrap `app.init()` in `async function init() { ... }; init();`.
**Warning signs:** Dev server works fine but `vite build` produces an empty canvas or JS error.

### Pitfall 2: Shared Package Not Resolving in tsx

**What goes wrong:** `tsx` can't find `@crayon-world/shared` — module not found error.
**Why it happens:** pnpm workspace symlink exists but `shared/package.json` `main` field points to a path that doesn't exist yet (e.g., compiled `dist/`).
**How to avoid:** Set `"main": "./src/types.ts"` in `shared/package.json` to point directly to source. tsx handles TypeScript imports natively.
**Warning signs:** Server starts failing after a clean `pnpm install`.

### Pitfall 3: Express v5 Async Error Handling Change

**What goes wrong:** Unhandled promise rejections in route handlers don't get caught by Express error middleware.
**Why it happens:** Express v4 required `next(err)` for async errors; Express v5 automatically catches rejected promises in route handlers — but only if you're using the v5 API correctly.
**How to avoid:** Be aware Express v5 is now default on npm. Async route handlers that throw will be caught automatically by v5. Don't mix v4 `next(err)` patterns unnecessarily.
**Warning signs:** Routes that look correct silently fail without the error middleware firing.

### Pitfall 4: CORS Missing for Express When Not Using Vite Proxy

**What goes wrong:** Direct requests from browser to Express (e.g., testing with Postman or different port) get CORS-blocked.
**Why it happens:** Vite proxy rewrites requests to same-origin, hiding the cross-origin nature. Direct Express calls need explicit CORS.
**How to avoid:** Always add `cors()` middleware to Express even if Vite proxy is used in dev. This also prepares for production deployment.
**Warning signs:** Browser console shows `Access-Control-Allow-Origin` error when bypassing the Vite dev server.

### Pitfall 5: .env Not Loaded When Running Tests

**What goes wrong:** Tests that test mock mode behavior fail because `MOCK_AI` and `ANTHROPIC_API_KEY` are undefined.
**Why it happens:** vitest doesn't automatically load `.env` files.
**How to avoid:** Use vitest's `dotenv` option in `vitest.config.ts`, or explicitly set test env vars inline using `process.env` stubs in the test setup.
**Warning signs:** Mock detection logic returns unexpected results in test runs.

---

## Code Examples

Verified patterns from official sources:

### Root pnpm-workspace.yaml

```yaml
# Source: https://pnpm.io/workspaces
packages:
  - "client"
  - "server"
  - "shared"
```

### tsconfig.base.json (root)

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

### shared/src/types.ts (skeleton for Phase 1)

```typescript
// Defines contracts consumed by both client and server.
// Server generates EntityProfile; client receives and renders it.

export type Archetype =
  | 'walking'
  | 'flying'
  | 'rooted'
  | 'spreading'
  | 'drifting'
  | 'stationary';

export interface EntityProfile {
  name: string;         // e.g. "Wolf"
  archetype: Archetype;
  traits: string[];     // e.g. ["predatory", "pack hunter"]
  role: string;         // e.g. "Apex predator"
}
```

### server/src/mock-entities.ts

```typescript
import type { EntityProfile } from '@crayon-world/shared';

export const MOCK_ENTITIES: EntityProfile[] = [
  { name: 'Wolf',  archetype: 'walking',    traits: ['predatory', 'pack animal'],   role: 'Apex predator' },
  { name: 'Eagle', archetype: 'flying',     traits: ['sharp vision', 'territorial'], role: 'Aerial hunter' },
  { name: 'Oak',   archetype: 'rooted',     traits: ['ancient', 'shelter-giving'],  role: 'Ecosystem anchor' },
  { name: 'Fire',  archetype: 'spreading',  traits: ['consuming', 'unstoppable'],   role: 'Force of nature' },
  { name: 'Cloud', archetype: 'drifting',   traits: ['weightless', 'changing'],     role: 'Sky wanderer' },
  { name: 'Rock',  archetype: 'stationary', traits: ['immovable', 'enduring'],      role: 'Landmark' },
];
```

### server/src/index.ts (skeleton)

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import recognizeRouter from './routes/recognize';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/recognize', recognizeRouter);

app.listen(PORT, () => {
  const mockMode = process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY;
  console.log(`Server on :${PORT} | mock=${mockMode}`);
});
```

### Root package.json dev scripts

```json
{
  "scripts": {
    "dev:client": "pnpm --filter client dev",
    "dev:server": "pnpm --filter server dev",
    "build": "pnpm --filter shared build && pnpm --filter client build"
  }
}
```

### server/package.json dev script using tsx watch

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node + nodemon | tsx watch | 2023–2024 | Single tool, no config, esbuild-fast |
| Express v4 | Express v5 (now npm default) | Oct 2024 / Mar 2025 v5.1 as default | Async error propagation; v5 is what `npm install express` installs |
| PixiJS constructor options | `await app.init({...})` | PixiJS v8 (2024) | Mandatory async; v7 code breaks silently |
| Vitest workspace file | `projects:` array in root config | Vitest v3.2 (2025) | `vitest.workspace` deprecated; use `vitest.config.ts` with `projects` |
| Vite v6 | Vite v8 | 2025 | Top-level await issues may be resolved but defensive wrapping still advised |

**Deprecated/outdated:**
- `ts-node`: Slower than tsx, requires separate nodemon config, has ESM compatibility issues. Use tsx.
- `PIXI.Application` constructor options (v7 style): Removed in v8; will throw if used.
- `vitest.workspace.ts` separate file: Deprecated in v3.2; integrate into vitest.config.ts.

---

## Open Questions

1. **TypeScript module resolution for shared package in production build**
   - What we know: `tsx` and `vite` both handle raw `.ts` imports natively in dev
   - What's unclear: Whether a shared `dist/` is needed for production Vite build, or if Vite can resolve `.ts` imports from the workspace package directly
   - Recommendation: Test `vite build` early (Wave 1 or 2 task) to verify shared types resolve; if not, add a trivial `tsc` compile to `shared/` pre-build step

2. **Express v5 + @types/express compatibility**
   - What we know: Express v5.2.x is current; `@types/express` v5 is the matching types package
   - What's unclear: Exact npm install name — `@types/express` may auto-resolve to v4 types depending on lockfile state
   - Recommendation: Explicitly pin `@types/express@^5` in server devDependencies

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | `vitest.config.ts` in each package (Wave 0 creates) |
| Quick run command | `pnpm --filter server test --run` |
| Full suite command | `pnpm -r test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-01 | ANTHROPIC_API_KEY absent from client bundle | manual smoke | Inspect `vite build` output — `grep -r "sk-ant" dist/` | ❌ Wave 0 |
| INFR-02 | Mock mode returns valid EntityProfile when MOCK_AI=true | unit | `pnpm --filter server test --run tests/mock.test.ts` | ❌ Wave 0 |
| INFR-02 | Mock mode auto-activates when API key is missing | unit | same file | ❌ Wave 0 |
| INFR-03 | Browser loads PixiJS canvas without login | manual smoke | Open `http://localhost:5173` — canvas visible, no auth challenge | N/A manual |

### Sampling Rate

- **Per task commit:** `pnpm --filter server test --run`
- **Per wave merge:** `pnpm -r test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/tests/mock.test.ts` — covers INFR-02 (mock entity pool, auto-detect logic)
- [ ] `server/vitest.config.ts` — vitest config for server package
- [ ] Install vitest in server: `pnpm --filter server add -D vitest`

---

## Sources

### Primary (HIGH confidence)
- [pixijs.com/8.x/guides/components/application](https://pixijs.com/8.x/guides/components/application) — PixiJS v8 async init pattern, resizeTo option
- [tsx.is/watch-mode](https://tsx.is/watch-mode) — tsx watch command syntax and caveats
- [pnpm.io/workspaces](https://pnpm.io/workspaces) — workspace: protocol, pnpm-workspace.yaml
- [vite.dev/config/server-options](https://vite.dev/config/server-options) — Vite proxy config
- [pixijs.com/blog/8.11.0](https://pixijs.com/blog/8.11.0) — PixiJS v8 release info
- [expressjs.com/2025/03/31/v5-1-latest-release.html](https://expressjs.com/2025/03/31/v5-1-latest-release.html) — Express v5 as npm default

### Secondary (MEDIUM confidence)
- [colinhacks.com/essays/live-types-typescript-monorepo](https://colinhacks.com/essays/live-types-typescript-monorepo) — live types pattern for shared package; verified against pnpm docs
- [hackernoon.com pnpm monorepo guide](https://hackernoon.com/how-to-set-up-a-monorepo-with-vite-typescript-and-pnpm-workspaces) — tsconfig.base.json patterns
- [dev.to/itxtoledo PixiJS v8 quick start](https://dev.to/itxtoledo/getting-started-with-pixijs-v8-quick-start-guide-26fm) — v8 init code example (cross-verified with official docs)

### Tertiary (LOW confidence)
- Various Medium/DEV posts on Express + dotenv patterns — standard and stable but not cross-verified beyond npmjs.com package pages

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — version numbers verified via npm registries and official release posts
- Architecture: HIGH — pnpm workspace patterns verified via official pnpm docs; PixiJS init verified via official docs
- Pitfalls: MEDIUM — most verified via official docs (Express v5 async behavior, PixiJS v8 init); CORS and dotenv pitfalls from community cross-verification
- Test map: MEDIUM — vitest 4.x confirmed as latest; workspace test config pattern from official vitest docs

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable stack; PixiJS minor updates monthly but v8 API is stable)
