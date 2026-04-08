---
phase: 8
slug: interaction-behaviors
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 8 — Validation Strategy

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
| 08-01-00 | 01 | 1 | INTR-01-05 | unit | `pnpm run test -- interactionBehaviors` | ❌ W0 | ⬜ pending |
| 08-01-01 | 01 | 1 | INTR-01-05 | unit | `pnpm run test -- interactionBehaviors` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | INTR-01-05 | unit | `pnpm run test -- interactionBehaviors` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | INTR-01-05 | type+visual | `npx tsc --noEmit --project client/tsconfig.json` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/interactionBehaviors.test.ts` — covers chase steering (INTR-01), flee steering (INTR-02), fight contact resolution (INTR-03), befriend drift (INTR-04), no-target fallback (INTR-05). Pure function tests for steering math and resolveInteraction.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Predator visibly steers toward prey | INTR-01 | Visual — movement direction | Start round with wolf + rabbit, observe wolf chasing |
| Prey visibly flees from predator | INTR-02 | Visual — flee direction | Observe rabbit moving away from wolf |
| Hostile entity removed on contact | INTR-03 | Visual — fade-out animation | Watch fire approach tree, tree fades out |
| Symbiotic entities stay near each other | INTR-04 | Visual — proximity behavior | Spawn cloud + oak, observe they drift together |
| Neutral entities continue archetype | INTR-05 | Visual — unchanged movement | Entity with no relationships still wanders normally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
