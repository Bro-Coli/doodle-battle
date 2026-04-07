# Roadmap: Crayon World

## Milestones

- ✅ **v1.0 Single-Player PoC** — Phases 1-5 (shipped 2026-04-07)
- ◆ **v1.2 React Client Integration** — Phases 6-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Single-Player PoC (Phases 1-5) — SHIPPED 2026-04-07</summary>

- [x] Phase 1: Infrastructure (2/2 plans) — completed 2026-04-07
- [x] Phase 2: Drawing Canvas (2/2 plans) — completed 2026-04-07
- [x] Phase 3: Recognition Pipeline (2/2 plans) — completed 2026-04-07
- [x] Phase 4: Entity Spawn & Rendering (2/2 plans) — completed 2026-04-07
- [x] Phase 5: Entity Simulation (3/3 plans) — completed 2026-04-07

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details open>
<summary>◆ v1.2 React Client Integration (Phases 6-7) — IN PROGRESS</summary>

- [ ] Phase 6: React Control Surface (0/0 plans) — pending
  - Goal: Move toolbar and mode controls into React while preserving draw/world behavior
  - Requirements: UIM-01, UIM-03, UIM-04
  - Success criteria:
    1. Submit, Undo, Clear, and mode toggle are rendered by React.
    2. Brush thickness controls are rendered by React and still affect drawing behavior.
    3. Draw mode and world mode can still be toggled without breaking the stage.
    4. No imperative toolbar creation remains in the client entrypoint.
- [ ] Phase 7: React Overlay Parity (0/0 plans) — pending
  - Goal: Move recognition overlays into React and verify gameplay parity
  - Requirements: UIM-02, UIM-05
  - Success criteria:
    1. Loading, result, and error UI states render through React components.
    2. Recognition success still leads to entity spawn through the existing game flow.
    3. Recognition failure and retry remain usable after the migration.
    4. Core drawing, recognition, spawn, and simulation behavior still work after the UI migration.

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure | v1.0 | 2/2 | Complete | 2026-04-07 |
| 2. Drawing Canvas | v1.0 | 2/2 | Complete | 2026-04-07 |
| 3. Recognition Pipeline | v1.0 | 2/2 | Complete | 2026-04-07 |
| 4. Entity Spawn & Rendering | v1.0 | 2/2 | Complete | 2026-04-07 |
| 5. Entity Simulation | v1.0 | 3/3 | Complete | 2026-04-07 |
| 6. React Control Surface | v1.2 | 0/0 | Pending | — |
| 7. React Overlay Parity | v1.2 | 0/0 | Pending | — |
