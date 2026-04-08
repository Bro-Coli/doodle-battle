# Phase 6: React Control Surface - Research

**Date:** 2026-04-07
**Phase:** 06-react-control-surface
**Requirements:** UIM-01, UIM-03, UIM-04

## Research Question

What needs to be true for the client to migrate the existing toolbar from imperative DOM creation into React without breaking the draw/world loop?

## Current State

- `client/src/main.ts` owns the full client bootstrap. It creates the Pixi application, drawing canvas, world stage, recognition overlay, keyboard undo handler, and the toolbar DOM.
- Toolbar behavior already exists in one place:
  - submit, clear, and undo enable only when the drawing surface is not empty
  - thickness controls disable in world mode
  - the Draw/World toggle stays enabled and flips label text based on `worldStage.inWorld`
- `RecognitionOverlay` still owns loading, result, error, and mock badge DOM. Phase 6 explicitly defers loading/result/error overlays, but the lightweight mock badge can move with the React control surface.
- `DrawingCanvas` exposes the right low-level hooks for a React bridge:
  - `undo()`
  - `clear()`
  - `setThickness()`
  - `isEmpty`
  - `undoStack.onChange`
- `WorldStage` already exposes the draw/world toggle boundary through `toggle()` and `inWorld`.

## Key Constraints

### 1. React should own visible controls, not the simulation runtime

This milestone does not justify a broad React rewrite. The stable boundary is:

- Pixi app, drawing canvas, world stage, and recognition overlay remain imperative runtime objects
- React owns toolbar rendering and lightweight status chrome
- `main.ts` should pass a narrow controller object into React rather than re-implementing runtime logic inside components

This keeps Phase 6 focused on UIM-01/UIM-03/UIM-04 and avoids dragging Phase 7 overlay work forward.

### 2. The migration needs a synchronization layer

React components need state for:

- `isCanvasEmpty`
- `isWorldMode`
- `selectedThickness`
- `isBusySubmitting`
- `isMockMode`

Most of these values currently live implicitly in imperative code. A small controller/store layer in the client package is the cleanest way to expose them to React while still delegating the underlying actions to `DrawingCanvas`, `WorldStage`, and `RecognitionOverlay`.

### 3. Keyboard undo must keep working

Current keyboard undo is attached at `document` level in `main.ts`. If React owns the toolbar but the drawing runtime stays imperative, keyboard undo should remain registered outside React and call the same controller action used by the Undo button. That preserves D-06 without introducing focus-management regressions.

### 4. React integration will require client build setup changes

The client package currently has no React dependencies, no JSX TS config, and no Vite React plugin. The phase should therefore include:

- `react` and `react-dom`
- `@vitejs/plugin-react`
- client TS config support for JSX
- Vite config update for the React plugin

### 5. Execution risk is behavioral drift, not visual complexity

The existing toolbar is intentionally small. The main regression risks are:

- stale React state when canvas emptiness changes
- disabled-state mismatches between draw and world mode
- submit flow leaving the toolbar permanently disabled after success or failure
- mock badge moving into React but diverging from the existing `/api/recognize/status` boot-time check

The plan should prioritize parity checks over design expansion.

## Recommended Architecture

### React mount point alongside Pixi canvas

- Append the Pixi canvas as today
- Create a dedicated DOM mount node for React UI
- Render a small React app into that node

This removes direct `document.createElement` ownership for the toolbar while keeping the rest of the runtime stable.

### Thin client controller boundary

Introduce a React-facing controller module that:

- exposes actions: `submit`, `undo`, `clear`, `toggleView`, `setThickness`
- computes or stores view state: canvas emptiness, world mode, active thickness, busy state, mock mode
- subscribes to runtime events such as `undoStack.onChange`
- keeps submit flow logic in one place so button state and async recognition state are synchronized

This controller should be created in `main.ts` after the imperative runtime objects exist, then passed into React via props or context.

### Phase-appropriate component split

A minimal component tree is sufficient:

- `StudioControlsApp` or similar root
- `Toolbar`
- `ActionButtons`
- `ThicknessToggle`
- optional `MockModeBadge`

Do not move recognition loading/result/error UI into React yet.

## Planning Implications

### Plan decomposition

Two execution plans are appropriate:

1. React bootstrap plus controller bridge
2. React-rendered controls, styling parity, and browser verification

This split matches the main technical dependency:

- React components cannot be wired safely until a runtime bridge exists
- the visual migration can proceed once the bridge is stable

### Files likely involved

- `client/package.json`
- `pnpm-lock.yaml`
- `client/tsconfig.json`
- `client/vite.config.ts`
- `client/src/main.ts`
- new React UI files under `client/src/ui/` or `client/src/react/`
- `client/src/style.css`
- possibly a new controller/store module under `client/src/ui/` or `client/src/app/`

## Verification Focus

Automated verification should at least include:

- `pnpm --filter @crayon-world/client build`

Human verification is still required for:

- button enabled/disabled parity
- draw/world toggle behavior
- thickness changes still affecting drawing
- mock badge visibility in mock mode
- no direct toolbar creation via `document.createElement` in `main.ts`

## Recommendation

Plan Phase 6 as a narrow React migration with a controller bridge, not as a full app-shell rewrite. Preserve the existing runtime objects and submit flow semantics, and verify parity through browser checks after the React toolbar is mounted.

---
*Research completed: 2026-04-07*
