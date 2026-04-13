import type { WalkingState, WorldBounds } from '../EntitySimulation';
import { wrapPosition, mapRange } from '../EntitySimulation';

/**
 * Walking behaviors — dispatches on movementStyle.
 * Pure functions — no mutation, no PixiJS imports.
 */
export function updateWalking(state: WalkingState, dt: number, world: WorldBounds): WalkingState {
  switch (state.movementStyle) {
    case 'scampering':
      return updateScampering(state, dt, world);
    case 'lumbering':
      return updateLumbering(state, dt, world);
    case 'hopping':
      return updateHopping(state, dt, world);
    case 'prowling':
    default:
      return updateProwling(state, dt, world);
  }
}

/**
 * Prowling — walk/pause patrol. Energy lengthens pauses; agility shortens walk bursts.
 */
function updateProwling(state: WalkingState, dt: number, world: WorldBounds): WalkingState {
  const dtMs = dt * 1000;

  if (state.pauseTimer > 0) {
    return { ...state, pauseTimer: state.pauseTimer - dtMs };
  }

  if (state.walkTimer > 0) {
    const newX = state.x + state.vx * dt;
    const newY = state.y + state.vy * dt;
    const wrapped = wrapPosition(newX, newY, world.width, world.height);
    const newWalkTimer = state.walkTimer - dtMs;

    if (newWalkTimer > 0) {
      return { ...state, x: wrapped.x, y: wrapped.y, walkTimer: newWalkTimer };
    }

    // Expired — pick a new direction; longer pauses for high-energy (bursty) entities.
    const heading = Math.random() * Math.PI * 2;
    const pauseTimer = mapRange(state.energy, 300, 1800) + Math.random() * 500;
    const walkTimer = mapRange(11 - state.agility, 1500, 3500) + Math.random() * 1000;
    return {
      ...state,
      x: wrapped.x,
      y: wrapped.y,
      walkTimer,
      pauseTimer,
      heading,
      vx: Math.cos(heading) * state.speed,
      vy: Math.sin(heading) * state.speed,
    };
  }

  const heading = Math.random() * Math.PI * 2;
  return {
    ...state,
    pauseTimer: 500 + Math.random() * 1000,
    walkTimer: 2000 + Math.random() * 2000,
    heading,
    vx: Math.cos(heading) * state.speed,
    vy: Math.sin(heading) * state.speed,
  };
}

/**
 * Scampering — fast, frequent turns, rare pauses.
 */
function updateScampering(state: WalkingState, dt: number, world: WorldBounds): WalkingState {
  const dtMs = dt * 1000;
  const newX = state.x + state.vx * dt;
  const newY = state.y + state.vy * dt;
  const wrapped = wrapPosition(newX, newY, world.width, world.height);

  // Frequent direction changes — probability scales with agility.
  const turnProb = 0.02 + state.agility * 0.01; // ~3-12% per tick
  const newWalkTimer = state.walkTimer - dtMs;

  if (Math.random() < turnProb || newWalkTimer <= 0) {
    const heading = state.heading + (Math.random() - 0.5) * Math.PI; // jitter up to ±90°
    return {
      ...state,
      x: wrapped.x,
      y: wrapped.y,
      heading,
      vx: Math.cos(heading) * state.speed,
      vy: Math.sin(heading) * state.speed,
      walkTimer: 600 + Math.random() * 800,
    };
  }

  return { ...state, x: wrapped.x, y: wrapped.y, walkTimer: newWalkTimer };
}

/**
 * Lumbering — slow, straight-line, rare turns, occasional long pauses.
 */
function updateLumbering(state: WalkingState, dt: number, world: WorldBounds): WalkingState {
  const dtMs = dt * 1000;

  if (state.pauseTimer > 0) {
    return { ...state, pauseTimer: state.pauseTimer - dtMs };
  }

  const newX = state.x + state.vx * dt;
  const newY = state.y + state.vy * dt;
  const wrapped = wrapPosition(newX, newY, world.width, world.height);
  const newWalkTimer = state.walkTimer - dtMs;

  if (newWalkTimer <= 0) {
    const heading = state.heading + (Math.random() - 0.5) * 0.6; // gentle course change
    return {
      ...state,
      x: wrapped.x,
      y: wrapped.y,
      heading,
      vx: Math.cos(heading) * state.speed,
      vy: Math.sin(heading) * state.speed,
      walkTimer: 4000 + Math.random() * 3000,
      pauseTimer: state.energy > 7 ? 800 + Math.random() * 1200 : 0,
    };
  }

  return { ...state, x: wrapped.x, y: wrapped.y, walkTimer: newWalkTimer };
}

/**
 * Hopping — discrete vertical arcs. Horizontal velocity only between hops.
 * Visual y = hopOriginY - sin(hopPhase)*amp.
 */
function updateHopping(state: WalkingState, dt: number, world: WorldBounds): WalkingState {
  const dtMs = dt * 1000;
  const interval = state.hopInterval > 0 ? state.hopInterval : 600;

  // Advance phase (one full hop = interval ms → phase 0..π)
  const phaseStep = (Math.PI / interval) * dtMs;
  let hopPhase = state.hopPhase + phaseStep;

  // On landing (phase wraps past π), pick a new heading.
  let heading = state.heading;
  let vx = state.vx;
  let vy = state.vy;
  if (hopPhase >= Math.PI) {
    hopPhase = 0;
    heading = heading + (Math.random() - 0.5) * (mapRange(state.agility, 0.2, 1.6));
    vx = Math.cos(heading) * state.speed;
    vy = Math.sin(heading) * state.speed;
  }

  const newX = state.x + vx * dt;
  const newHopOrigin = state.hopOriginY + vy * dt;
  const wrapped = wrapPosition(newX, newHopOrigin, world.width, world.height);

  // Visual y includes the hop arc.
  const hopAmp = 18;
  const y = wrapped.y - Math.sin(hopPhase) * hopAmp;

  return {
    ...state,
    x: wrapped.x,
    y,
    vx,
    vy,
    heading,
    hopPhase,
    hopOriginY: wrapped.y,
  };
}
