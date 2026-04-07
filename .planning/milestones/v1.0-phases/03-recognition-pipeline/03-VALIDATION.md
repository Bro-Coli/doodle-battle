---
phase: 3
slug: recognition-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (already installed in server package) |
| **Config file** | `server/vitest.config.ts` (exists) |
| **Quick run command** | `pnpm --filter @crayon-world/server test` |
| **Full suite command** | `pnpm -r test --run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @crayon-world/server test`
- **After every plan wave:** Run `pnpm -r test --run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual visual smoke test
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 0 | RECG-01, RECG-04 | unit | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 | ⬜ pending |
| TBD | 01 | 1 | RECG-01 | unit (mock Anthropic) | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 | ⬜ pending |
| TBD | 01 | 1 | RECG-02 | unit | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 | ⬜ pending |
| TBD | 01 | 1 | RECG-03 | manual | — | N/A | ⬜ pending |
| TBD | 01 | 1 | RECG-04 | unit (validateProfile) | `pnpm --filter @crayon-world/server test` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/recognize.test.ts` — covers RECG-01 real path with mocked SDK, RECG-02 open vocab, RECG-04 validation
- [ ] `server/tests/validateProfile.test.ts` — unit tests for `validateEntityProfile`: valid object, missing fields, unknown archetype→stationary, null input, non-object input

*Existing `mock.test.ts` already covers mock mode (RECG-01 partial).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Loading spinner visible during recognition | RECG-03 | DOM overlay, no test harness | Submit drawing, verify spinner appears and disappears on result |
| Result card shows full EntityProfile | RECG-03 | Visual verification | Submit drawing, verify card shows name, archetype, traits, role |
| Error toast on API failure | RECG-03 | DOM overlay | Stop server, submit drawing, verify toast appears with retry option |
| Canvas clears on card dismiss | RECG-03 | UI state | Submit, wait for card dismiss, verify canvas clears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
