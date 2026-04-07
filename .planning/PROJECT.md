# Crayon World

## What This Is

A multiplayer browser game where players draw anything freehand and AI brings those drawings to life as autonomous entities that behave according to their real-world identity. Inspired by Harold and the Purple Crayon and Scribblenauts. Two teams compete across scenarios with asymmetric objectives — strategic thinking, not drawing skill, determines the winner.

The current milestone is a **single-player proof of concept** that validates the core magic: draw something, AI recognizes it, it spawns and behaves like itself.

## Core Value

The moment you draw something and it comes alive acting like itself — a wolf that hunts, a bird that flies, a tree that grows. That recognition-to-behavior pipeline is the entire game.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Player can draw freehand on a canvas with stylus or mouse
- [ ] Drawing is exported as PNG and sent to Claude Haiku for recognition
- [ ] AI returns an entity label (open vocabulary — no fixed object list)
- [ ] AI generates a behavior profile (movement archetype, traits) from the entity label
- [ ] Entity spawns on the canvas with identity-appropriate movement (wolf walks, bird flies, tree stays rooted)
- [ ] Multiple entities coexist on the canvas simultaneously
- [ ] Entity movement follows one of the defined archetypes (rooted, walking, flying, spreading, drifting, stationary)
- [ ] Common entity recognition results are cached to minimize API costs

### Out of Scope

- Multiplayer / networking — deferred to next milestone, but stack must not block it
- Scenario system / team objectives — general behavior only for PoC
- Entity-vs-entity interaction (chasing, combat) — entities move independently for now
- Crayon aesthetic / paper texture — visual polish deferred
- Sound design — deferred
- Login / authentication — web-accessible, no login
- Island / biome map — simple flat canvas for PoC

## Context

This is a hackathon project with a **May 1, 2026 submission deadline** (~3 weeks). Code will be heavily AI-assisted. The concept doc outlines a full 4-week plan with multiplayer and multiple scenarios, but the PoC focuses on proving the draw-to-life pipeline works before layering on competitive gameplay.

The full vision includes Colyseus multiplayer, asymmetric team scenarios (Population, Siege, Escort), and 50+ entities on screen. The PoC stack must be architected so multiplayer can be added without rewriting — TypeScript shared types, client/server separation even if the server is local initially.

Key technical insight from the concept: "The AI does the hard work once at spawn. The game engine runs simple, fast rules every frame." This means behavior profiles are generated once via API, then the simulation runs cheaply on generic movement archetypes.

## Constraints

- **Timeline**: May 1, 2026 hackathon deadline — ~3 weeks
- **AI Budget**: $100 Anthropic API credit — Claude Haiku at ~$0.0001/call, caching critical
- **Platform**: Browser-based, no install, no login
- **Stack**: TypeScript + PixiJS (rendering) — chosen for GPU-accelerated 2D and shared types with future Colyseus server
- **Multiplayer-ready**: Architecture must support adding Colyseus without rewrite

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-player PoC first | Prove core loop before adding networking complexity | — Pending |
| PixiJS for rendering | GPU-accelerated 2D, tiny bundle, instant load | — Pending |
| Claude Haiku for recognition | Best sketch understanding, $100 credits available | — Pending |
| TypeScript end-to-end | Shared types between future client/server | — Pending |
| No scenarios in PoC | General behavior proves the concept without scenario injection complexity | — Pending |
| Cache recognition results | Minimize API costs — cache by entity label | — Pending |

---
*Last updated: 2026-04-07 after initialization*
