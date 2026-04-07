# Requirements: Crayon World

**Defined:** 2026-04-07
**Core Value:** The moment you draw something and it comes alive acting like itself — a wolf that hunts, a bird that flies, a tree that grows.

## v1 Requirements

Requirements for the single-player proof of concept. Each maps to roadmap phases.

### Drawing Canvas

- [x] **DRAW-01**: Player can draw freehand on a canvas with mouse or touch input
- [x] **DRAW-02**: Strokes render in real-time with smooth, tapered appearance
- [x] **DRAW-03**: Player can clear the entire drawing canvas
- [x] **DRAW-04**: Player can undo the last stroke

### AI Recognition

- [x] **RECG-01**: Drawing is exported as PNG and sent to Claude Haiku for entity recognition
- [x] **RECG-02**: AI returns an entity label using open vocabulary (no fixed object list)
- [ ] **RECG-03**: Loading indicator displayed during AI processing
- [x] **RECG-04**: Graceful error handling when drawing is unrecognized (fallback entity or message)
- [ ] **RECG-05**: Behavior profile displayed to player on spawn (traits, role)

### Entity System

- [ ] **ENTY-01**: Entity spawns as a distinct visual object on the canvas after recognition
- [ ] **ENTY-02**: Entity moves according to its archetype (walking, flying, rooted, spreading, drifting, stationary)
- [ ] **ENTY-03**: Multiple entities coexist on the canvas simultaneously
- [ ] **ENTY-04**: Entity name label floats above its sprite

### Infrastructure

- [x] **INFR-01**: Server-side API proxy keeps Anthropic API key secure
- [x] **INFR-02**: Mock AI mode for development (hardcoded profiles, no API calls)
- [x] **INFR-03**: Browser-accessible with no login or install required

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Multiplayer

- **MULT-01**: Real-time multiplayer via Colyseus with room creation and join-by-code
- **MULT-02**: Authoritative server-side simulation
- **MULT-03**: Two teams with asymmetric objectives

### Scenarios

- **SCEN-01**: Scenario system with context injection into AI recognition
- **SCEN-02**: Population scenario (count living entities at round end)
- **SCEN-03**: Siege scenario (destroy/defend structure)
- **SCEN-04**: Round structure with draw/simulate/score phases

### Entity Interactions

- **INTR-01**: Entities interact based on hostile_to and symbiosis lists
- **INTR-02**: Entity health and decay system
- **INTR-03**: Proximity-based interaction triggers

### Polish

- **POLH-01**: Crayon aesthetic with paper texture and multiply blend
- **POLH-02**: Sound design
- **POLH-03**: Spawn animation (pencil lines animate into entity)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Escort scenario | High complexity, not needed to validate core loop |
| Island / biome map | Simple flat canvas sufficient for PoC |
| Spectator mode | Multiplayer feature, not relevant to single-player PoC |
| Persistent accounts / save states | No login is a constraint — stateless sessions |
| Leaderboards / scoring | Meaningless without scenarios |
| AI-generated entity artwork | Too slow and expensive for real-time loop |
| Realistic physics simulation | Conflicts with archetype-based movement design |
| Drawing quality gates | Punishes casual players, against design philosophy |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DRAW-01 | Phase 2 | Complete |
| DRAW-02 | Phase 2 | Complete |
| DRAW-03 | Phase 2 | Complete |
| DRAW-04 | Phase 2 | Complete |
| RECG-01 | Phase 3 | Complete |
| RECG-02 | Phase 3 | Complete |
| RECG-03 | Phase 3 | Pending |
| RECG-04 | Phase 3 | Complete |
| RECG-05 | Phase 4 | Pending |
| ENTY-01 | Phase 4 | Pending |
| ENTY-02 | Phase 5 | Pending |
| ENTY-03 | Phase 4 | Pending |
| ENTY-04 | Phase 4 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after roadmap creation*
