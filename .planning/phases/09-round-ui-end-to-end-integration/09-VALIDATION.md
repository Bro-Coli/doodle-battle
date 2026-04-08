---
phase: 9
slug: round-ui-end-to-end-integration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (server package) + tsc (client) |
| **Config file** | `server/vitest.config.ts` |
| **Quick run command** | `pnpm run test` |
| **Full suite command** | `pnpm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run test` + `npx tsc --noEmit --project client/tsconfig.json`
- **After every plan wave:** Run both
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Conscious Verification Trade-Off

Phase 9 is primarily UI wiring (outcome card overlay, dismiss callback, main.ts re-sequencing). The outcome card is a DOM overlay following the established create-on-show pattern. TypeScript compilation catches structural errors; the human checkpoint covers visual correctness and the full E2E round loop.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 09-01-01 | 01 | 1 | ROUND-04 | type-check | `npx tsc --noEmit --project client/tsconfig.json` | pending |
| 09-01-02 | 01 | 1 | ROUND-04 | human | E2E round lifecycle visual verification | pending |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Outcome card shows survivors and removed | ROUND-04 | Visual — DOM content | Complete a round, verify card content |
| Card overlays world view | ROUND-04 | Visual — z-index layering | Confirm entities visible behind card |
| Click to dismiss triggers draw switch | ROUND-04 | Visual — view transition | Click dismiss, confirm switch to draw mode |
| Full E2E loop (multi-round) | ROUND-04 | Integration — full flow | Draw, start round, see outcome, dismiss, draw more, start again |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (tsc for client code)
- [x] Human checkpoint covers E2E flow
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (tsc + human checkpoint strategy)
