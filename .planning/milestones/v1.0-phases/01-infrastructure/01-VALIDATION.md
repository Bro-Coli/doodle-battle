---
phase: 1
slug: infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `server/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `pnpm --filter server test --run` |
| **Full suite command** | `pnpm -r test --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter server test --run`
- **After every plan wave:** Run `pnpm -r test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | INFR-01 | manual smoke | `grep -r "sk-ant" dist/` after `vite build` | N/A manual | ⬜ pending |
| TBD | 01 | 1 | INFR-02 | unit | `pnpm --filter server test --run tests/mock.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | INFR-02 | unit | same file (auto-detect logic) | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | INFR-03 | manual smoke | Open `http://localhost:5173` — canvas visible | N/A manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/mock.test.ts` — stubs for INFR-02 (mock entity pool, auto-detect logic)
- [ ] `server/vitest.config.ts` — vitest config for server package
- [ ] Install vitest in server: `pnpm --filter server add -D vitest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| API key absent from client bundle | INFR-01 | Requires build output inspection | Run `pnpm --filter client build`, then `grep -r "sk-ant" client/dist/` — expect 0 matches |
| Browser loads canvas without login | INFR-03 | Requires visual browser check | Open `http://localhost:5173` — PixiJS canvas visible, no auth challenge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
