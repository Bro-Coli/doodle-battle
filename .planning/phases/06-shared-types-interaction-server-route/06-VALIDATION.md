---
phase: 6
slug: shared-types-interaction-server-route
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.0.0 |
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
| 06-01-01 | 01 | 1 | BATC-01, BATC-02, BATC-03 | unit | `pnpm run test -- interactions` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | BATC-01, BATC-02 | unit | `pnpm run test -- interactions` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | BATC-03 | unit | `pnpm run test -- interactions` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/interactions.test.ts` — covers BATC-01 (route accepts profiles, returns matrix), BATC-02 (classifies pairs as chase/flee/fight/befriend/ignore), BATC-03 (mock mode returns canned data)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | All behaviors are API-testable | — |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
