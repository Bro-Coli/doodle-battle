---
phase: 7
slug: round-state-machine-entity-removal
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (server package) |
| **Config file** | `server/vitest.config.ts` |
| **Quick run command** | `pnpm run test` |
| **Full suite command** | `pnpm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run test` (server) + `npx tsc --noEmit --project client/tsconfig.json` (client)
- **After every plan wave:** Run both
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Conscious Verification Trade-Off

Phase 7 code lives entirely in `client/` and is tightly coupled to PixiJS (Container, Ticker, Application) and the DOM (overlay elements, setInterval timers). No client-side Vitest infrastructure exists in this project.

**Decision:** Use `tsc --noEmit` for automated type-checking and rely on the Plan 07-02 human checkpoint for behavioral verification of the round lifecycle.

**Rationale:**
- WorldStage methods depend on PixiJS Application, Ticker, Container — mocking these to test phase transitions would test mock fidelity, not behavior
- RoundOverlay is pure DOM manipulation — testing with jsdom adds infrastructure cost disproportionate to PoC scope
- The human checkpoint in Plan 07-02 covers the complete round lifecycle end-to-end
- Server-side tests (existing) continue to cover the `/api/interactions` route

**What tsc catches:** Type mismatches in RoundPhase, missing map cleanup keys, incorrect method signatures, broken imports between WorldStage/fetchInteractions/RoundOverlay.

**What the human checkpoint catches:** Visual spinner, countdown timer, entity freezing, view auto-switching, toolbar gating, multi-round persistence.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 07-01-01 | 01 | 1 | ROUND-02, ROUND-03, REMV-01, REMV-02 | type-check | `npx tsc --noEmit --project client/tsconfig.json` | pending |
| 07-01-02 | 01 | 1 | ROUND-02, ROUND-03, REMV-01, REMV-02 | type-check | `npx tsc --noEmit --project client/tsconfig.json` | pending |
| 07-02-01 | 02 | 2 | ROUND-01, ROUND-02, ROUND-03 | type-check | `npx tsc --noEmit --project client/tsconfig.json` | pending |
| 07-02-02 | 02 | 2 | ROUND-01, ROUND-02, ROUND-03 | human | Manual round lifecycle verification | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

N/A — No Wave 0 test scaffolding needed. See "Conscious Verification Trade-Off" above. Type-checking via `tsc --noEmit` serves as the automated verification layer for client-side code.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visible countdown timer during simulation | ROUND-02 | Visual — timer renders correctly | Start a round, observe countdown on screen |
| Spinner overlay during analyzing phase | ROUND-02 | Visual — overlay displays | Start a round, observe spinner before simulation |
| Auto-switch to world/draw mode | ROUND-01 | Visual — view transition | Start a round, confirm auto-switch to world; end round, confirm auto-switch to draw |
| Entity fade-out on removal | REMV-01 | Visual — animation smoothness | Remove entity during round, observe 0.5s fade |
| Entities frozen between rounds | ROUND-03 | Visual — no movement in idle | End a round, switch to world, confirm entities are stationary |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (tsc --noEmit for client code)
- [x] Sampling continuity: type-check runs after every task
- [x] Wave 0 trade-off documented (no mock-heavy client tests for PoC)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (tsc + human checkpoint strategy)
