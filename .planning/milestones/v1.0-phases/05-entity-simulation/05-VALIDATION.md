---
phase: 5
slug: entity-simulation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
---

# Phase 5 — Validation Strategy

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
| 05-01-01 | 01 | 1 | ENTY-02 | unit | `pnpm run test -- --reporter=verbose tests/validateProfile.test.ts` | ✅ (extend) | ⬜ pending |
| 05-01-02 | 01 | 1 | ENTY-02 | unit | `pnpm run test -- --reporter=verbose tests/mock.test.ts` | ✅ (extend) | ⬜ pending |
| 05-02-00 | 02 | 1 | ENTY-02 | unit | `pnpm run test -- tests/behaviors.test.ts` | ✅ (Wave 0 task creates it) | ⬜ pending |
| 05-02-01 | 02 | 1 | ENTY-02 | type | `npx tsc --noEmit --project client/tsconfig.json` | ✅ (task creates it) | ⬜ pending |
| 05-02-02 | 02 | 1 | ENTY-02 | unit | `pnpm run test -- tests/behaviors.test.ts --reporter=verbose` | ✅ (Wave 0) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `server/tests/behaviors.test.ts` — Plan 05-02 Task 0 creates this file with tests for: wrapPosition at all 4 edges, rooted originX no-drift, flying bobOriginY no-drift, spreading isACopy suppresses pendingSpawn, stationary returns same state reference, walking pauseTimer/walkTimer state machine transitions
- [ ] Extend `server/tests/validateProfile.test.ts` — Plan 05-01 Task 2 adds test cases for `speed` field (valid, invalid, missing, out-of-range)
- [ ] Extend `server/tests/mock.test.ts` — Plan 05-01 Task 2 adds assertion that all 6 mock entities have `speed` in [1, 10]

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visibly distinct movement per archetype | ENTY-02 | Visual judgment — movement "looks right" | Spawn wolf (walking), eagle (flying), tree (rooted), fire (spreading), cloud (drifting), rock (stationary) and observe distinct patterns |
| Identity-appropriate movement | ENTY-02 | Subjective — "a wolf walks, a bird flies" | Draw wolf, bird, tree — verify each moves in recognizable way |
| Sprite rotation faces direction | ENTY-02 | Visual — rotation looks correct | Watch walking/flying entities change direction and confirm sprite rotates |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
