# Phase 9: Round UI & End-to-End Integration - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Round outcome card at round end showing survivors/removed/round number, and E2E verification of the full draw → start → analyze → simulate → outcome → draw loop. Most round UI (Start Round button, spinner, countdown, toolbar gating, view switching, double-click protection) was already built in Phases 7-8. This phase adds the outcome card and verifies the complete flow.

</domain>

<decisions>
## Implementation Decisions

### Round outcome card
- Shows at round end with: **survivors list** (entity names still alive), **removed list** (entity names destroyed during round), **round number** ("Round 1 Complete")
- **Overlays world view** — player sees final entity positions behind the card
- **Click to dismiss** — player clicks card or dismiss button, then auto-switches to draw mode
- Toolbar stays disabled while outcome card is showing — re-enables after dismiss

### Already built (from Phases 7-8)
- Start Round button in toolbar, disabled until entities exist — DONE
- Spinner overlay during analyzing phase — DONE (RoundOverlay.showAnalyzingSpinner)
- Countdown timer during simulation — DONE (RoundOverlay.startCountdown)
- All toolbar buttons disabled during round — DONE
- Auto-switch to world view on Start Round — DONE
- Auto-switch to draw mode on round end — NEEDS CHANGE: delay until outcome card dismissed
- Double-click protection — DONE (immediate button disable)
- Fixed 30s rounds — DONE

### Claude's Discretion
- Outcome card visual design and positioning
- How to track round number (simple counter on WorldStage)
- How to track which entities were removed during a round (snapshot before vs after)
- CSS styling for outcome card
- Integration approach for delaying the draw-mode switch until card dismiss

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/world/RoundOverlay.ts`: Already has spinner and countdown — outcome card can be added as a third method (`showOutcome`)
- `client/src/recognition/RecognitionOverlay.ts`: Card popup pattern with dismiss callback — reusable pattern for outcome card
- `client/src/world/WorldStage.ts`: `onRoundPhaseChange` callback, `_endRound()`, `_entityProfiles` map for survivor names, `removeEntity()` handles defeat tracking
- `client/src/main.ts`: `onRoundPhaseChange` callback already handles phase transitions — outcome card hooks into the `idle` transition

### Established Patterns
- `create-on-show, remove-on-dismiss` DOM pattern for overlays
- HTML overlay for all UI (not PixiJS)
- Callback-based dismiss (RecognitionOverlay.showCard uses onDismiss callback)

### Integration Points
- `_endRound()` in WorldStage needs to provide outcome data (survivors, removed, round number) to the overlay
- `onRoundPhaseChange('idle')` in main.ts currently auto-switches to draw — needs to show outcome card first, switch on dismiss
- RoundOverlay gets a new `showOutcome(data, onDismiss)` method

</code_context>

<specifics>
## Specific Ideas

- The outcome card is the "recap moment" — player pauses to see what happened before drawing more. The world view behind the card shows the aftermath.
- Round number gives a sense of progression even in the single-player PoC.
- The removed list creates dramatic stakes — "Your rabbit was eliminated by Wolf!"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-round-ui-end-to-end-integration*
*Context gathered: 2026-04-08*
