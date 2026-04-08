# Phase 6: React Control Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 06-react-control-surface
**Areas discussed:** Control Layout, View Toggle UX, Control State Rules, React Boundary

---

## Control Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Keep compact top toolbar | Matches current studio usage and minimizes migration risk | ✓ |
| Move to sidebar panel | Larger structural change, better for future shell work |
| Introduce new studio frame layout | Expands scope beyond control-surface migration |

**User's choice:** the agent decided using the recommended default.
**Notes:** User explicitly said "알아서해줘". Chose the lowest-risk option that preserves current workflow and visual behavior.

---

## View Toggle UX

| Option | Description | Selected |
|--------|-------------|----------|
| Single Draw/World toggle | Preserves current model and keeps phase scope tight | ✓ |
| Segmented mode switch | Clearer affordance but changes the interaction pattern |
| Split/persistent dual view | Broadens phase into layout redesign |

**User's choice:** the agent decided using the recommended default.
**Notes:** Keeping the existing toggle reduces planning ambiguity and respects the prior decision that draw and world are separate views.

---

## Control State Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve current disable rules | Best parity baseline for migration validation | ✓ |
| Relax some disabled states | Changes behavior and complicates regression evaluation |
| Redesign interaction rules | Out of scope for this phase |

**User's choice:** the agent decided using the recommended default.
**Notes:** Chosen to keep the draw-to-life loop stable while React takes over ownership of the control UI.

---

## React Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Toolbar plus lightweight status UI | Keeps control surface cohesive without pulling in overlay migration | ✓ |
| Toolbar only | Valid but leaves related lightweight status UI split |
| Toolbar plus all overlays | Pulls Phase 7 work into Phase 6 |

**User's choice:** the agent decided using the recommended default.
**Notes:** Mock-mode badge can move with the toolbar, but loading/result/error overlays remain explicitly deferred to Phase 7.

---

## the agent's Discretion

- Exact React component/module boundaries for the toolbar
- Final placement of the mock badge within the React-owned control surface
- CSS refactor depth required to preserve the current visual presentation

## Deferred Ideas

- Recognition overlay migration belongs to Phase 7
- Full React app shell or lobby restructuring belongs to later work
- Routing and external state-management adoption remain out of scope
