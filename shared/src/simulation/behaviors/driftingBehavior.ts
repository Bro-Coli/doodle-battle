import type { DriftingState, WorldBounds } from '../EntitySimulation';
import { wrapPosition } from '../EntitySimulation';

/**
 * Drifting behaviors — dispatches on movementStyle.
 * Pure functions — no mutation, no PixiJS imports.
 */
export function updateDrifting(
  state: DriftingState,
  dt: number,
  world: WorldBounds,
): DriftingState {
  switch (state.movementStyle) {
    case 'tumbling':
      return updateTumbling(state, dt, world);
    case 'bobbing':
    default:
      return updateBobbing(state, dt, world);
  }
}

/**
 * Bobbing — horizontal drift + sine vertical bob from a fixed origin.
 */
function updateBobbing(state: DriftingState, dt: number, world: WorldBounds): DriftingState {
  const newX = state.x + state.vx * dt;
  const bobPhase = state.bobPhase + 1.0 * dt;
  const y = state.bobOriginY + Math.sin(bobPhase) * state.bobAmplitude;
  const wrapped = wrapPosition(newX, y, world.width, world.height);

  return { ...state, x: wrapped.x, y, bobPhase };
}

/**
 * Tumbling — drift + rotation. Same translation pattern as bobbing but the
 * rotation angle advances so renderers can visually tumble the sprite.
 */
function updateTumbling(state: DriftingState, dt: number, world: WorldBounds): DriftingState {
  const newX = state.x + state.vx * dt;
  const bobPhase = state.bobPhase + 0.6 * dt;
  const y = state.bobOriginY + Math.sin(bobPhase) * (state.bobAmplitude * 0.5);
  const wrapped = wrapPosition(newX, y, world.width, world.height);
  const rotation = state.rotation + state.rotationSpeed * dt;

  return { ...state, x: wrapped.x, y, bobPhase, rotation };
}
