# Phase 1: Infrastructure - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffold with multiplayer-ready architecture (client/server/shared), API proxy for Anthropic key security, mock AI mode for development, and a browser-accessible blank PixiJS canvas with no login required. No drawing input, no AI calls, no entities — just the foundation.

</domain>

<decisions>
## Implementation Decisions

### Canvas first impression
- Full viewport canvas — takes the entire browser window, immersive game feel
- White/light background — clean paper feel, drawings will stand out
- Black stroke color (for when drawing is implemented in Phase 2)
- Toolbar visible from start — Submit, Clear, Undo buttons ready before first stroke (disabled until drawing exists)

### Mock entity set
- 6 hardcoded mock entities, one per archetype:
  - Wolf (walking), Eagle (flying), Oak (rooted), Fire (spreading), Cloud (drifting), Rock (stationary)
- Mock mode activates automatically when ANTHROPIC_API_KEY is missing (zero config for new devs)
- Explicit MOCK_AI=true env var also available to force mock even when key is present
- Mock returns random entity from pool — no attempt to match drawing content

### Project tooling
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes patterns

### Integration Points
- shared/types.ts will define EntityProfile, Archetype, and other types consumed by both client and server
- Server /api/recognize endpoint will be the single integration point between client and AI layer

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The concept doc specifies the tech stack (PixiJS, TypeScript, Express, Claude Haiku) and the research confirms these choices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-infrastructure*
*Context gathered: 2026-04-07*
