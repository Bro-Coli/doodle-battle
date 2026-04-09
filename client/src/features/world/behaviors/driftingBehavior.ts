import type { DriftingState } from '../EntitySimulation';
import type { WorldBounds } from '../EntitySimulation';
import { wrapPosition } from '../EntitySimulation';

/**
 * Slow horizontal drift with sine-wave vertical bob from a fixed origin.
 * bobOriginY is constant — no vertical drift.
 * Pure function — no mutation, no PixiJS imports.
 */
export function updateDrifting(
  state: DriftingState,
  dt: number,
  world: WorldBounds,
): DriftingState {
  const newX = state.x + state.vx * dt;
  const bobPhase = state.bobPhase + 1.0 * dt;
  const y = state.bobOriginY + Math.sin(bobPhase) * state.bobAmplitude;

  // Wrap x only (bobOriginY stays fixed)
  const wrapped = wrapPosition(newX, y, world.width, world.height);

  return {
    ...state,
    x: wrapped.x,
    y,
    bobPhase,
  };
}
