import type { StationaryState } from '../EntitySimulation';
import type { WorldBounds } from '../EntitySimulation';

/**
 * No-op — stationary entities produce no state changes.
 * Pure function — no mutation, no PixiJS imports.
 */
export function updateStationary(
  state: StationaryState,
  _dt: number,
  _world: WorldBounds,
): StationaryState {
  return state;
}
