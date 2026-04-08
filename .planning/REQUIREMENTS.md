# Requirements: Crayon World

**Defined:** 2026-04-07
**Core Value:** The moment you draw something and it comes alive acting like itself — and now interacting with other entities based on their real-world identities.

## v1.1 Requirements

Requirements for entity interactions and round-based gameplay. Each maps to roadmap phases.

### Round System

- [x] **ROUND-01**: Player can press "Start Round" to begin a round after drawing entities
- [x] **ROUND-02**: Round runs for a timed duration (~30 seconds) then ends automatically
- [x] **ROUND-03**: Surviving entities persist into the next round — world accumulates
- [ ] **ROUND-04**: UI clearly indicates current round phase (drawing, analyzing, simulating, done)

### Batch AI Analysis

- [x] **BATC-01**: Pressing "Start Round" sends all entity profiles to a single Haiku call that returns interaction relationships
- [x] **BATC-02**: Interaction response classifies each entity pair as chase/flee, fight, symbiosis, or ignore
- [x] **BATC-03**: Mock mode returns canned interaction relationships for development without API calls

### Entity Interactions

- [ ] **INTR-01**: Predator entities chase prey entities using steering behavior
- [ ] **INTR-02**: Prey entities flee from their predators
- [ ] **INTR-03**: Hostile entity pairs fight when in proximity — loser is removed from world
- [ ] **INTR-04**: Symbiotic entities move toward each other and coexist beneficially
- [ ] **INTR-05**: Neutral entities ignore each other and continue their archetype behavior

### Entity Removal

- [x] **REMV-01**: Defeated entities fade out and are fully removed (container, state, label, texture references)
- [x] **REMV-02**: Entities in "dying" state do not participate in further interactions

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
- **SCEN-04**: Turn-based draw phases with simultaneous reveals

### Polish

- **POLH-01**: Crayon aesthetic with paper texture and multiply blend
- **POLH-02**: Sound design
- **POLH-03**: Spawn animation (pencil lines animate into entity)

## Out of Scope

| Feature | Reason |
|---------|--------|
| HP / health system | Binary fight resolution — loser removed, no damage tracking |
| Per-pair API calls | Budget killer — single batch call is cost-viable |
| Entity-initiated round start | Player controls rounds manually for PoC |
| Pathfinding / obstacles | Flat canvas with steering behaviors is sufficient |
| Symbiosis visual effects | Cosmetic polish — deferred to future milestone |
| Entity trading / economics | Too complex for interaction PoC |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROUND-01 | Phase 7 | Complete |
| ROUND-02 | Phase 7 | Complete |
| ROUND-03 | Phase 7 | Complete |
| ROUND-04 | Phase 9 | Pending |
| BATC-01 | Phase 6 | Complete |
| BATC-02 | Phase 6 | Complete |
| BATC-03 | Phase 6 | Complete |
| INTR-01 | Phase 8 | Pending |
| INTR-02 | Phase 8 | Pending |
| INTR-03 | Phase 8 | Pending |
| INTR-04 | Phase 8 | Pending |
| INTR-05 | Phase 8 | Pending |
| REMV-01 | Phase 7 | Complete |
| REMV-02 | Phase 7 | Complete |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after v1.1 roadmap creation*
