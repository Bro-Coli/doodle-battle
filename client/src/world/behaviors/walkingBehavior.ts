import type { WalkingState } from '../EntitySimulation';
import type { WorldBounds } from '../EntitySimulation';
import { wrapPosition } from '../EntitySimulation';

/**
 * Patrol wander: walk, pause, change direction.
 * Pure function — no mutation, no PixiJS imports.
 */
export function updateWalking(state: WalkingState, dt: number, world: WorldBounds): WalkingState {
  const dtMs = dt * 1000;

  // Pausing — just decrement timer
  if (state.pauseTimer > 0) {
    return {
      ...state,
      pauseTimer: state.pauseTimer - dtMs,
    };
  }

  // Walking — move and tick down walkTimer
  if (state.walkTimer > 0) {
    const newX = state.x + state.vx * dt;
    const newY = state.y + state.vy * dt;
    const wrapped = wrapPosition(newX, newY, world.width, world.height);
    const newWalkTimer = state.walkTimer - dtMs;

    if (newWalkTimer > 0) {
      return {
        ...state,
        x: wrapped.x,
        y: wrapped.y,
        walkTimer: newWalkTimer,
      };
    }

    // walkTimer just expired — enter pause immediately
    const heading = Math.random() * Math.PI * 2;
    const pauseTimer = 500 + Math.random() * 1000; // 500-1500ms
    const newWalkTimerNext = 2000 + Math.random() * 2000; // 2-4 seconds
    return {
      ...state,
      x: wrapped.x,
      y: wrapped.y,
      walkTimer: newWalkTimerNext,
      pauseTimer,
      heading,
      vx: Math.cos(heading) * state.speed,
      vy: Math.sin(heading) * state.speed,
    };
  }

  // walkTimer is 0 on init edge case — same as expired
  const heading = Math.random() * Math.PI * 2;
  const pauseTimer = 500 + Math.random() * 1000;
  return {
    ...state,
    pauseTimer,
    walkTimer: 2000 + Math.random() * 2000,
    heading,
    vx: Math.cos(heading) * state.speed,
    vy: Math.sin(heading) * state.speed,
  };
}
