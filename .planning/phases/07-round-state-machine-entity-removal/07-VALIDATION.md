---
phase: 7
slug: round-state-machine-entity-removal
status: draft
nyquist_compliant: false
wave_0_complete: false
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

- **After every task commit:** Run `pnpm run test`
- **After every plan wave:** Run `pnpm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | ROUND-01, ROUND-02, ROUND-03, REMV-01, REMV-02 | unit | `pnpm run test -- roundStateMachine` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | ROUND-01, ROUND-04 | visual | `npx tsc --noEmit --project client/tsconfig.json` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/roundStateMachine.test.ts` — covers RoundPhase transitions, _removeEntity cleanup (5 maps + destroy), dying entities skipped in tick, survivors persist, Start Round guard

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visible countdown timer during simulation | ROUND-02 | Visual — timer renders correctly | Start a round, observe countdown on screen |
| Spinner overlay during analyzing phase | ROUND-04 | Visual — overlay displays | Start a round, observe spinner before simulation |
| Auto-switch to world/draw mode | ROUND-01 | Visual — view transition | Start a round, confirm auto-switch to world; end round, confirm auto-switch to draw |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
