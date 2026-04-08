import type { RootedState } from '../EntitySimulation';
import type { WorldBounds } from '../EntitySimulation';

/**
 * Subtle sway from a fixed origin. originX never changes.
 * Pure function — no mutation, no PixiJS imports.
 */
export function updateRooted(state: RootedState, dt: number, _world: WorldBounds): RootedState {
  const swayPhase = state.swayPhase + 1.5 * dt;
  const x = state.originX + Math.sin(swayPhase) * 3; // 3px amplitude

  return {
    ...state,
    x,
    swayPhase,
  };
}
