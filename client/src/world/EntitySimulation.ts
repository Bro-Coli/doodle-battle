import type { Archetype } from '@crayon-world/shared/src/types';
import { updateWalking } from './behaviors/walkingBehavior';
import { updateFlying } from './behaviors/flyingBehavior';
import { updateRooted } from './behaviors/rootedBehavior';
import { updateSpreading } from './behaviors/spreadingBehavior';
import { updateDrifting } from './behaviors/driftingBehavior';
import { updateStationary } from './behaviors/stationaryBehavior';

// ---------------------------------------------------------------------------
// World bounds type (shared by all behavior functions)
// ---------------------------------------------------------------------------

export interface WorldBounds {
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Per-archetype state types
// ---------------------------------------------------------------------------

export interface WalkingState {
  archetype: 'walking';
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  speed: number;
  pauseTimer: number;
  walkTimer: number;
}

export interface FlyingState {
  archetype: 'flying';
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  angularVelocity: number;
  speed: number;
  bobPhase: number;
  bobOriginY: number;
}

export interface RootedState {
  archetype: 'rooted';
  x: number;
  y: number;
  originX: number;
  swayPhase: number;
}

export interface SpreadingState {
  archetype: 'spreading';
  x: number;
  y: number;
  spawnTimer: number;
  spawnInterval: number;
  spawnRadius: number;
  isACopy: boolean;
  pendingSpawn: boolean;
}

export interface DriftingState {
  archetype: 'drifting';
  x: number;
  y: number;
  vx: number;
  bobPhase: number;
  bobAmplitude: number;
  bobOriginY: number;
}

export interface StationaryState {
  archetype: 'stationary';
  x: number;
  y: number;
}

export type EntityState =
  | WalkingState
  | FlyingState
  | RootedState
  | SpreadingState
  | DriftingState
  | StationaryState;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Map a profile speed (1-10) to a pixel-per-second value with slight variance.
 */
export function mapSpeed(profileSpeed: number, minPx: number, maxPx: number): number {
  const base = minPx + ((profileSpeed - 1) / 9) * (maxPx - minPx);
  const variance = 0.9 + Math.random() * 0.2;
  return base * variance;
}

/**
 * Clamp a position inside world bounds (solid borders).
 * Entities stop at screen edges instead of wrapping around.
 */
export function clampPosition(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(w, x)),
    y: Math.max(0, Math.min(h, y)),
  };
}

/** @deprecated Use clampPosition instead. Kept for test compatibility. */
export const wrapPosition = clampPosition;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the initial EntityState for a given archetype at a spawn position.
 * profileSpeed is 1-10 from EntityProfile.
 */
export function initEntityState(
  archetype: Archetype,
  profileSpeed: number,
  spawnX: number,
  spawnY: number,
): EntityState {
  switch (archetype) {
    case 'walking': {
      const speed = mapSpeed(profileSpeed, 20, 120);
      const heading = Math.random() * Math.PI * 2;
      return {
        archetype: 'walking',
        x: spawnX,
        y: spawnY,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        heading,
        speed,
        pauseTimer: 0,
        walkTimer: 2000 + Math.random() * 2000, // 2-4 seconds in ms
      };
    }

    case 'flying': {
      const speed = mapSpeed(profileSpeed, 40, 200);
      const heading = Math.random() * Math.PI * 2;
      const angularVelocity = (0.3 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1);
      return {
        archetype: 'flying',
        x: spawnX,
        y: spawnY,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        heading,
        angularVelocity,
        speed,
        bobPhase: 0,
        bobOriginY: spawnY,
      };
    }

    case 'rooted': {
      return {
        archetype: 'rooted',
        x: spawnX,
        y: spawnY,
        originX: spawnX,
        swayPhase: Math.random() * Math.PI * 2,
      };
    }

    case 'spreading': {
      return {
        archetype: 'spreading',
        x: spawnX,
        y: spawnY,
        spawnTimer: 0,
        spawnInterval: 3000 + Math.random() * 2000, // 3-5 seconds
        spawnRadius: 40 + Math.random() * 40, // 40-80px
        isACopy: false,
        pendingSpawn: false,
      };
    }

    case 'drifting': {
      const vx = mapSpeed(profileSpeed, 8, 40);
      return {
        archetype: 'drifting',
        x: spawnX,
        y: spawnY,
        vx,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmplitude: 6 + Math.random() * 6, // 6-12px
        bobOriginY: spawnY,
      };
    }

    case 'stationary': {
      return {
        archetype: 'stationary',
        x: spawnX,
        y: spawnY,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatch to the correct behavior function by archetype.
 * dt is in seconds (ticker.deltaMS / 1000).
 */
export function dispatchBehavior(state: EntityState, dt: number, world: WorldBounds): EntityState {
  switch (state.archetype) {
    case 'walking':
      return updateWalking(state, dt, world);
    case 'flying':
      return updateFlying(state, dt, world);
    case 'rooted':
      return updateRooted(state, dt, world);
    case 'spreading':
      return updateSpreading(state, dt, world);
    case 'drifting':
      return updateDrifting(state, dt, world);
    case 'stationary':
      return updateStationary(state, dt, world);
  }
}
