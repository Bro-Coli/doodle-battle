import type { SpreadingState } from '../EntitySimulation';
import type { WorldBounds } from '../EntitySimulation';

/**
 * Signals pendingSpawn at intervals. Copies never spawn.
 * Pure function — no mutation, no PixiJS imports.
 */
export function updateSpreading(
  state: SpreadingState,
  dt: number,
  _world: WorldBounds,
): SpreadingState {
  // Copies never spread — return unchanged
  if (state.isACopy) {
    return state;
  }

  const newSpawnTimer = state.spawnTimer - dt * 1000;

  if (newSpawnTimer <= 0) {
    return {
      ...state,
      spawnTimer: state.spawnInterval,
      pendingSpawn: true,
    };
  }

  return {
    ...state,
    spawnTimer: newSpawnTimer,
    pendingSpawn: false,
  };
}
