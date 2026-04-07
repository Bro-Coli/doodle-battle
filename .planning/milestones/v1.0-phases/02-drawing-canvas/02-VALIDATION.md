---
phase: 2
slug: drawing-canvas
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.0.0 |
| **Config file** | `server/vitest.config.ts` (existing server tests) |
| **Quick run command** | `pnpm run test` |
| **Full suite command** | `pnpm run test` |
| **Estimated runtime** | ~5 seconds |

**Note:** Client-side PixiJS drawing logic requires WebGL — jsdom cannot render it. All DRAW requirements are validated manually (visual inspection). Server test suite runs as the automated regression gate.

---

## Sampling Rate

- **After every task commit:** Run `pnpm run test`
- **After every plan wave:** Run `pnpm run test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual visual smoke test
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | DRAW-01 | manual | — | N/A | ⬜ pending |
| TBD | 01 | 1 | DRAW-02 | manual | — | N/A | ⬜ pending |
| TBD | 01 | 1 | DRAW-03 | manual | — | N/A | ⬜ pending |
| TBD | 01 | 1 | DRAW-04 | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Server vitest config and tests already exist. No additional test framework setup needed.

*If pure-logic modules (e.g., UndoStack) are written with zero PixiJS imports, lightweight vitest unit tests may be added at planner's discretion.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pointer events start, continue, and end a stroke | DRAW-01 | PixiJS requires WebGL; jsdom cannot render | Draw a stroke with mouse — verify real-time ink |
| Strokes appear smooth and tapered | DRAW-02 | Visual verification only | Draw curves — verify no jagged edges, tapered ends |
| Clear removes all strokes and disables buttons | DRAW-03 | UI state verification | Draw, click Clear — verify canvas empty, buttons disabled |
| Undo removes last stroke and updates button states | DRAW-04 | UI state verification | Draw 3 strokes, undo — verify last removed, buttons update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
