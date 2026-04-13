import type { SpreadingState } from '../EntitySimulation';
import type { WorldBounds } from '../EntitySimulation';

/**
 * Spreading entities do not move or self-spawn on a timer. `pendingSpawn` is
 * set externally by the simulation driver when the entity consumes (kills) a
 * victim via proximity damage.
 */
export function updateSpreading(
  state: SpreadingState,
  _dt: number,
  _world: WorldBounds,
): SpreadingState {
  return state;
}
