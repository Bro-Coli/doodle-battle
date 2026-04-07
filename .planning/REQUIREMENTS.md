# Requirements: Crayon World

**Defined:** 2026-04-07
**Core Value:** The moment you draw something and it comes alive acting like itself — a wolf that hunts, a bird that flies, a tree that grows. That recognition-to-behavior pipeline is the entire game.

## v1 Requirements

Requirements for milestone v1.2 React Client Integration.

### UI Migration

- [ ] **UIM-01**: User can use a React-rendered toolbar for submit, undo, clear, and draw/world mode switching.
- [ ] **UIM-02**: User can see recognition loading, result, and error states through React-rendered overlays.
- [ ] **UIM-03**: User can change brush thickness through React-rendered controls.
- [ ] **UIM-04**: User can keep the existing draw mode and world mode flow after the UI migration.
- [ ] **UIM-05**: User can still draw, recognize, spawn, and simulate entities after the React UI migration without regression to the core draw-to-life loop.

## v2 Requirements

### React Architecture

- **RARC-01**: Client boots through a fully React-owned application shell and screen structure.
- **RARC-02**: Pixi lifecycle is encapsulated behind a reusable React-friendly controller boundary.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full client architecture rewrite around React | Deferred because this milestone is scoped to visible UI migration only |
| Routing system | Not required to validate React adoption for the client |
| Global state management library | Current milestone does not justify extra state tooling |
| Full visual redesign | Migration should preserve existing core behavior rather than expand design scope |
| Multiplayer or lobby flow expansion | Separate product scope from React UI migration |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UIM-01 | Phase 6 | Pending |
| UIM-02 | Phase 7 | Pending |
| UIM-03 | Phase 6 | Pending |
| UIM-04 | Phase 6 | Pending |
| UIM-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after roadmap creation for milestone v1.2*
