# Feature Landscape

**Domain:** AI-powered drawing browser game / creative sandbox
**Project:** Crayon World
**Researched:** 2026-04-07

---

## Reference Games Analyzed

| Game | Core Loop | AI Role | Key Lesson |
|------|-----------|---------|------------|
| Scribblenauts | Write word → object spawns with physics behavior | NLP → entity catalog | Open vocabulary kills it. Expectation: anything you type (or draw) works. |
| Crayon Physics | Draw shapes → physics simulation takes over | No AI — pure physics | Immediate visual feedback loop is non-negotiable. Latency kills the magic. |
| Quick Draw (Google) | Draw → neural net guesses in ~20 sec | CV recognition | Recognition confidence display ("I think it's a...") adds delight. Failure is funny. |
| Google AutoDraw | Draw → suggests professional icons | CV + suggestion UI | Users accept imperfect recognition when suggestions are offered. |
| Skribbl.io | Draw → others guess in real time | No AI | Social loop drives retention but is out of scope for PoC. |
| Spore Creature Creator | Draw/assemble → creature animates with procedural behavior | Rule-based emergent behavior | Players obsess over "what will it do?" — the spawn moment is the payoff. |

---

## Table Stakes

Features users expect from an AI drawing game. Missing any of these and the product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Freehand canvas drawing** | Every drawing game starts here. No canvas = no game. | Low | Mouse + touch/stylus support both required. |
| **Real-time stroke rendering** | Strokes must appear instantly as you draw. Any lag destroys the feel. | Low | PixiJS handles this via Graphics API. |
| **Clear/undo for drawing area** | Players need to retry bad drawings. Missing undo causes instant frustration. | Low | At minimum: clear button. Single-level undo is table stakes. |
| **Visible AI recognition feedback** | After submitting a drawing, player must see what the AI thinks it is. Silent spawning feels broken. | Low | Label shown at spawn, even briefly. |
| **Entity spawns visibly on canvas** | Spawned entity must appear as distinct visual object. | Medium | Needs a sprite or shape distinct from drawn strokes. |
| **Entity moves in recognizable way** | A wolf must walk. A bird must fly. A tree must stay still. Identity-appropriate motion is the core value. | Medium | 6 archetypes cover most cases. |
| **Multiple entities coexist** | Drawing one entity and having it replace the last would limit play immediately. | Medium | Entity list management, z-ordering, canvas bounds. |
| **No install / no login** | Browser game norm. Any friction barrier before first draw is unacceptable. | Low | Already in constraints. |
| **Loading/processing indicator** | AI calls take 0.5–3 seconds. Blank pause with no indicator feels like a crash. | Low | Spinner or "AI is thinking..." text. |
| **Error feedback for unrecognized drawings** | Silence on recognition failure is worse than a message. | Low | Fallback entity or humorous message. |

---

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Open vocabulary recognition** | Unlike fixed object lists, anything drawn can be recognized. The Scribblenauts "aha moment." | High | Depends on Claude Haiku's vision capability. PoC must validate. |
| **Behavior profile visible to player** | Showing traits ("Wolf: hunter, territorial") makes the AI's work legible and builds trust. | Low–Medium | Tooltip or spawn card. |
| **Recognition confidence display** | "I think this might be a... wolf!" adds delight before spawn. | Low | Staged reveal text. |
| **Entity interactions** | Bird avoids wolf, wolf chases sheep — elevates sandbox to "living world." | High | Post-PoC. Architecture must allow it. |
| **Emergent ecosystem behavior** | Wolf hunts rabbit, grass spreads, fire burns trees. Canvas evolves without player input. | Very High | Requires entity interactions first. |
| **Crayon aesthetic / paper texture** | Harold and the Purple Crayon visual language. Emotionally resonant. | Medium | Deferred per PROJECT.md. |
| **Spawn animation** | Pencil lines animate into entity — transforms "it appeared" into "it came to life." | Medium | Not PoC-required but transforms spawn moment. |
| **Entity label as world object** | Name floats above sprite. Canvas becomes readable "world dictionary." | Low | Trivial to add, high delight. |
| **Scenario / objective layer** | Population, Siege, Escort scenarios transform sandbox into competitive game. | Very High | Post-PoC. |
| **Multiplayer asymmetric teams** | Two teams drawing against each other. Nothing else in browser games does this. | Very High | Post-PoC. |

---

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Fixed object list** | Kills "anything works" feeling. Open vocabulary is the differentiator. | Trust the AI. Graceful fallback for unrecognized drawings. |
| **Drawing quality gates** | Creates anxiety, punishes casual players. | Spawn whatever the AI recognizes, even from rough strokes. |
| **Long confirmation flows** | Multi-step dialogs kill momentum. | Submit on button tap. No confirmation dialogs. |
| **Persistent accounts / save states** | Auth is wasted complexity for PoC and hackathon demo. | Stateless session. Canvas resets on refresh. |
| **Leaderboards / scoring in PoC** | Without scenarios, scoring is meaningless. | Score only when scenarios exist. |
| **AI-generated artwork for entities** | Image generation APIs are expensive, slow (seconds per call), style-inconsistent. | Procedural shapes or small sprite library keyed to archetypes. |
| **Realistic physics simulation** | Full Box2D conflicts with "AI does hard work once, game engine runs simple rules." | Archetype-based movement: fixed velocities, simple boundary bouncing. |
| **Tutorial / onboarding flow** | Adds scope without validating core loop. | Canvas starts empty with single hint: "Draw anything." |

---

## Feature Dependencies

```
Freehand canvas drawing
  └── Real-time stroke rendering
  └── Undo/clear
  └── Drawing export as PNG
        └── AI recognition
              └── Visible recognition feedback
              └── Behavior profile generation
                    └── Entity spawn with archetype motion
                          └── Multiple entities coexisting
                                └── Entity label display
                                └── Entity interactions (post-PoC)
                                      └── Emergent ecosystem (post-PoC)

Scenario system (post-PoC)
  └── Multiplayer / Colyseus (post-PoC)
        └── Asymmetric team objectives (post-PoC)
```

---

## MVP Recommendation

**Must ship (table stakes for the demo):**
1. Freehand canvas with real-time stroke rendering
2. Submit-to-AI button with loading indicator
3. Visible recognition feedback (entity label at spawn)
4. Entity spawns with archetype-appropriate motion
5. Multiple entities on canvas simultaneously
6. Clear canvas button
7. Graceful error handling for unrecognized drawings

**High-value additions within PoC scope (low complexity, high delight):**
- Behavior profile tooltip or spawn card
- Entity label floating above sprite
- Simple spawn animation (scale-in)

**Defer with confidence:** Entity interactions, crayon aesthetic, multiplayer, scenarios, sound.

---

*Features research: 2026-04-07*
