import type { FlyingState } from '../EntitySimulation';
import type { WorldBounds } from '../EntitySimulation';
import { wrapPosition } from '../EntitySimulation';

/**
 * Smooth arcs with sine bob. bobOriginY tracks real Y without bob.
 * Pure function — no mutation, no PixiJS imports.
 */
export function updateFlying(
  state: FlyingState,
  dt: number,
  world: WorldBounds,
): FlyingState {
  // Gradually turn
  let heading = state.heading + state.angularVelocity * dt;

  // Occasionally flip arc direction (~every 3 seconds at 60fps)
  const angularVelocity =
    Math.random() < 0.005 ? -state.angularVelocity : state.angularVelocity;

  // Update velocity from new heading
  const vx = Math.cos(heading) * state.speed;
  const vy = Math.sin(heading) * state.speed;

  // Move base position (no bob yet)
  const newX = state.x + vx * dt;
  const newBobOriginY = state.bobOriginY + vy * dt;

  // Wrap x and bobOriginY separately
  const wrappedX = wrapPosition(newX, newBobOriginY, world.width, world.height);

  // Update bob phase and compute final y with sine bob
  const bobPhase = state.bobPhase + 2.5 * dt;
  const y = wrappedX.y + Math.sin(bobPhase) * 8;

  return {
    ...state,
    x: wrappedX.x,
    y,
    vx,
    vy,
    heading,
    angularVelocity,
    bobPhase,
    bobOriginY: wrappedX.y,
  };
}
