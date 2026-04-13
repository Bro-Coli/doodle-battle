import type { FlyingState, WorldBounds } from '../EntitySimulation';
import { wrapPosition, mapRange } from '../EntitySimulation';

/**
 * Flying behaviors — dispatches on movementStyle.
 * Pure functions — no mutation, no PixiJS imports.
 */
export function updateFlying(state: FlyingState, dt: number, world: WorldBounds): FlyingState {
  switch (state.movementStyle) {
    case 'swooping':
      return updateSwooping(state, dt, world);
    case 'gliding':
      return updateGliding(state, dt, world);
    case 'hovering':
      return updateHovering(state, dt, world);
    case 'darting':
      return updateDarting(state, dt, world);
    case 'flapping':
    default:
      return updateFlapping(state, dt, world);
  }
}

/**
 * Flapping — steady arc with sine bob (classic bird).
 */
function updateFlapping(state: FlyingState, dt: number, world: WorldBounds): FlyingState {
  const heading = state.heading + state.angularVelocity * dt;
  const angularVelocity = Math.random() < 0.005 ? -state.angularVelocity : state.angularVelocity;
  const vx = Math.cos(heading) * state.speed;
  const vy = Math.sin(heading) * state.speed;
  const newX = state.x + vx * dt;
  const newBobOriginY = state.bobOriginY + vy * dt;
  const wrapped = wrapPosition(newX, newBobOriginY, world.width, world.height);
  const bobPhase = state.bobPhase + 2.5 * dt;
  const y = wrapped.y + Math.sin(bobPhase) * 8;

  return {
    ...state,
    x: wrapped.x,
    y,
    vx,
    vy,
    heading,
    angularVelocity,
    bobPhase,
    bobOriginY: wrapped.y,
  };
}

/**
 * Swooping — periodic dive-and-rise. Speed modulates horizontally; vertical
 * offset follows a sine (swoopPhase) with amplitude driven by energy.
 */
function updateSwooping(state: FlyingState, dt: number, world: WorldBounds): FlyingState {
  const heading = state.heading + state.angularVelocity * dt;
  const angularVelocity = Math.random() < 0.003 ? -state.angularVelocity : state.angularVelocity;
  const vx = Math.cos(heading) * state.speed;
  const vy = Math.sin(heading) * state.speed * 0.3; // mostly horizontal; swoop adds the vertical
  const newX = state.x + vx * dt;
  const newBobOriginY = state.bobOriginY + vy * dt;
  const wrapped = wrapPosition(newX, newBobOriginY, world.width, world.height);

  // Swoop phase advances more slowly than flapping; amplitude bigger.
  const phaseSpeed = mapRange(state.energy, 0.6, 1.8);
  const swoopPhase = state.swoopPhase + phaseSpeed * dt;
  const swoopAmp = mapRange(state.energy, 20, 55);
  const y = wrapped.y + Math.sin(swoopPhase) * swoopAmp;

  return {
    ...state,
    x: wrapped.x,
    y,
    vx,
    vy,
    heading,
    angularVelocity,
    swoopPhase,
    bobOriginY: wrapped.y,
  };
}

/**
 * Gliding — long smooth curves, minimal vertical motion, slow turns.
 */
function updateGliding(state: FlyingState, dt: number, world: WorldBounds): FlyingState {
  // Much slower turn rate than flapping.
  const turnDamp = 0.3;
  const heading = state.heading + state.angularVelocity * dt * turnDamp;
  const angularVelocity = Math.random() < 0.002 ? -state.angularVelocity : state.angularVelocity;
  const vx = Math.cos(heading) * state.speed;
  const vy = Math.sin(heading) * state.speed;
  const newX = state.x + vx * dt;
  const newBobOriginY = state.bobOriginY + vy * dt;
  const wrapped = wrapPosition(newX, newBobOriginY, world.width, world.height);
  const bobPhase = state.bobPhase + 0.8 * dt;
  const y = wrapped.y + Math.sin(bobPhase) * 3;

  return {
    ...state,
    x: wrapped.x,
    y,
    vx,
    vy,
    heading,
    angularVelocity,
    bobPhase,
    bobOriginY: wrapped.y,
  };
}

/**
 * Hovering — near-stationary with micro-motion around an origin that slowly drifts.
 */
function updateHovering(state: FlyingState, dt: number, world: WorldBounds): FlyingState {
  // Slowly drift the hover origin.
  const driftVx = Math.cos(state.heading) * state.speed * 0.4;
  const driftVy = Math.sin(state.heading) * state.speed * 0.4;
  const newOriginX = state.hoverOriginX + driftVx * dt;
  const newOriginY = state.hoverOriginY + driftVy * dt;
  const wrapped = wrapPosition(newOriginX, newOriginY, world.width, world.height);

  // Occasional heading jitter.
  const heading =
    Math.random() < 0.02
      ? state.heading + (Math.random() - 0.5) * Math.PI * 0.5
      : state.heading;

  // Micro-motion jitter scaled by agility.
  const jitter = mapRange(state.agility, 2, 8);
  const bobPhase = state.bobPhase + 6 * dt; // fast wing-beat
  const x = wrapped.x + Math.cos(bobPhase * 1.7) * jitter;
  const y = wrapped.y + Math.sin(bobPhase) * jitter;

  return {
    ...state,
    x,
    y,
    vx: driftVx,
    vy: driftVy,
    heading,
    bobPhase,
    hoverOriginX: wrapped.x,
    hoverOriginY: wrapped.y,
    bobOriginY: wrapped.y,
  };
}

/**
 * Darting — alternating burst + idle. Bursts are short, fast, with sharp direction changes.
 */
function updateDarting(state: FlyingState, dt: number, world: WorldBounds): FlyingState {
  const dtMs = dt * 1000;

  if (state.dartBurstTimer > 0) {
    // In a burst — move at full speed in current heading.
    const vx = Math.cos(state.heading) * state.speed;
    const vy = Math.sin(state.heading) * state.speed;
    const newX = state.x + vx * dt;
    const newY = state.y + vy * dt;
    const wrapped = wrapPosition(newX, newY, world.width, world.height);
    const newBurst = state.dartBurstTimer - dtMs;
    if (newBurst > 0) {
      return {
        ...state,
        x: wrapped.x,
        y: wrapped.y,
        vx,
        vy,
        dartBurstTimer: newBurst,
        bobOriginY: wrapped.y,
      };
    }
    // End burst → enter idle.
    return {
      ...state,
      x: wrapped.x,
      y: wrapped.y,
      vx: 0,
      vy: 0,
      dartBurstTimer: 0,
      dartIdleTimer: mapRange(11 - state.energy, 80, 400) + Math.random() * 200,
      bobOriginY: wrapped.y,
    };
  }

  // Idle — count down, then pick a new heading and burst.
  const newIdle = state.dartIdleTimer - dtMs;
  if (newIdle <= 0) {
    const heading = Math.random() * Math.PI * 2;
    return {
      ...state,
      heading,
      vx: 0,
      vy: 0,
      dartIdleTimer: 0,
      dartBurstTimer: mapRange(state.energy, 120, 400) + Math.random() * 150,
    };
  }
  return { ...state, vx: 0, vy: 0, dartIdleTimer: newIdle };
}
