---
phase: 4
slug: entity-spawn-rendering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (server package only — no client test runner) |
| **Config file** | `server/vitest.config.ts` |
| **Quick run command** | `pnpm run test` |
| **Full suite command** | `pnpm run test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run test`
- **After every plan wave:** Run `pnpm run test` + manual browser smoke test
- **Before `/gsd:verify-work`:** Full suite must be green + manual visual verification
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | ENTY-01 | manual | — | N/A | ⬜ pending |
| TBD | 01 | 1 | ENTY-03 | manual | — | N/A | ⬜ pending |
| TBD | 01 | 1 | ENTY-04 | manual | — | N/A | ⬜ pending |
| TBD | 01 | 1 | RECG-05 | manual | — | N/A (Phase 3 card) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No new test files needed — all phase 4 requirements are visual/rendering behaviors requiring live WebGL. Server test suite runs as regression gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Entity spawns as visual object after recognition | ENTY-01 | WebGL rendering | Submit drawing, verify entity sprite appears in game world |
| Entity name label floats above sprite | ENTY-04 | Visual positioning | Check label centered above entity, always visible |
| Behavior profile on hover | RECG-05 | DOM interaction | Hover entity, verify tooltip shows archetype/traits/role |
| Multiple entities coexist | ENTY-03 | Visual coexistence | Submit 3+ drawings, switch to world, verify all present |
| Draw/World view toggle | N/A (arch) | View switching | Click toggle, verify views switch correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
