import type { Archetype, EntityProfile, MapType, MovementStyle } from '../types';
import { activeSpeedForMap } from '../types';
import { updateWalking } from './behaviors/walkingBehavior';
import { updateFlying } from './behaviors/flyingBehavior';
import { updateRooted } from './behaviors/rootedBehavior';
import { updateDrifting } from './behaviors/driftingBehavior';
import { updateStationary } from './behaviors/stationaryBehavior';

// ---------------------------------------------------------------------------
// World bounds type (shared by all behavior functions)
// ---------------------------------------------------------------------------

export interface WorldBounds {
  width: number;
  height: number;
}

/** Canonical world bounds shared by server simulation and client rendering. */
export const WORLD_BOUNDS: WorldBounds = { width: 900, height: 900 };

// ---------------------------------------------------------------------------
// Shared motion modulators carried by every movable state.
// ---------------------------------------------------------------------------

export interface MotionModulators {
  movementStyle: MovementStyle;
  /** 1-10 — sharpness of direction changes. */
  agility: number;
  /** 1-10 — burstiness (low = steady, high = bursty with pauses). */
  energy: number;
}

// ---------------------------------------------------------------------------
// Per-archetype state types
// ---------------------------------------------------------------------------

export interface WalkingState extends MotionModulators {
  archetype: 'walking';
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  speed: number;
  pauseTimer: number;
  walkTimer: number;
  /** Hopping only — vertical offset phase (0 = grounded). */
  hopPhase: number;
  /** Hopping only — duration of a full hop in ms. */
  hopInterval: number;
  /** Hopping only — baseline y (y before hop offset). */
  hopOriginY: number;
}

export interface FlyingState extends MotionModulators {
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
  /** Swooping — dive phase counter (0..2π). */
  swoopPhase: number;
  /** Hovering — micro-motion origin. */
  hoverOriginX: number;
  hoverOriginY: number;
  /** Darting — remaining burst timer (ms). 0 = idle, then picks new burst. */
  dartBurstTimer: number;
  dartIdleTimer: number;
}

export interface RootedState extends MotionModulators {
  archetype: 'rooted';
  x: number;
  y: number;
  originX: number;
  swayPhase: number;
}

export interface DriftingState extends MotionModulators {
  archetype: 'drifting';
  x: number;
  y: number;
  vx: number;
  bobPhase: number;
  bobAmplitude: number;
  bobOriginY: number;
  /** Tumbling — rotation angle (stored but rendered by client). */
  rotation: number;
  rotationSpeed: number;
}

export interface StationaryState extends MotionModulators {
  archetype: 'stationary';
  x: number;
  y: number;
}

export type EntityState =
  | WalkingState
  | FlyingState
  | RootedState
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

/** Linear 1-10 → [min, max] without variance. */
export function mapRange(value: number, minOut: number, maxOut: number): number {
  return minOut + ((value - 1) / 9) * (maxOut - minOut);
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
 * Extract the motion-shaping fields used by initEntityState.
 * The `archetype` is the *effective* archetype for the current map — callers
 * pick walking/drifting/flying when the creature is off its home habitat, and
 * pass `speed` as the environment-specific speed (1-10).
 */
export interface InitProfile {
  archetype: Archetype;
  movementStyle: MovementStyle;
  speed: number;
  agility: number;
  energy: number;
}

/**
 * Create the initial EntityState for a given profile at a spawn position.
 */
export function initEntityState(
  profile: InitProfile,
  spawnX: number,
  spawnY: number,
): EntityState {
  const { archetype, movementStyle, speed: profileSpeed, agility, energy } = profile;
  const mods: MotionModulators = { movementStyle, agility, energy };

  switch (archetype) {
    case 'walking': {
      // Lumbering is slower, scampering is faster — scale the speed range by style.
      const [minPx, maxPx] =
        movementStyle === 'lumbering' ? [10, 60]
        : movementStyle === 'scampering' ? [60, 180]
        : movementStyle === 'hopping' ? [30, 120]
        : /* prowling */ [20, 120];

      const speed = mapSpeed(profileSpeed, minPx, maxPx);
      const heading = Math.random() * Math.PI * 2;
      return {
        ...mods,
        archetype: 'walking',
        x: spawnX,
        y: spawnY,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        heading,
        speed,
        pauseTimer: 0,
        walkTimer: 2000 + Math.random() * 2000,
        hopPhase: 0,
        // Hop interval — faster for high-energy hoppers.
        hopInterval: movementStyle === 'hopping' ? 400 + (11 - energy) * 60 : 0,
        hopOriginY: spawnY,
      };
    }

    case 'flying': {
      const [minPx, maxPx] =
        movementStyle === 'hovering' ? [5, 25]
        : movementStyle === 'darting' ? [80, 260]
        : movementStyle === 'gliding' ? [60, 220]
        : /* swooping / flapping */ [40, 200];

      const speed = mapSpeed(profileSpeed, minPx, maxPx);
      const heading = Math.random() * Math.PI * 2;
      // Agility drives how fast the heading turns.
      const turnRate = mapRange(agility, 0.2, 1.4);
      const angularVelocity = turnRate * (Math.random() < 0.5 ? 1 : -1);
      return {
        ...mods,
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
        swoopPhase: Math.random() * Math.PI * 2,
        hoverOriginX: spawnX,
        hoverOriginY: spawnY,
        dartBurstTimer: 0,
        dartIdleTimer: 200 + Math.random() * 300,
      };
    }

    case 'rooted': {
      return {
        ...mods,
        archetype: 'rooted',
        x: spawnX,
        y: spawnY,
        originX: spawnX,
        swayPhase: Math.random() * Math.PI * 2,
      };
    }

    case 'drifting': {
      const vx = mapSpeed(profileSpeed, 8, 40);
      // Tumbling adds rotation; bobbing has none.
      const rotationSpeed =
        movementStyle === 'tumbling' ? (0.4 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1) : 0;
      return {
        ...mods,
        archetype: 'drifting',
        x: spawnX,
        y: spawnY,
        vx,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmplitude: 6 + Math.random() * 6,
        bobOriginY: spawnY,
        rotation: 0,
        rotationSpeed,
      };
    }

    case 'stationary': {
      return {
        ...mods,
        archetype: 'stationary',
        x: spawnX,
        y: spawnY,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Environment resolution — decide what archetype + speed an entity uses on the
// current map. Returns null if the creature can't survive this map.
// ---------------------------------------------------------------------------

/** Default movement style for an archetype — used when we override a
 *  creature's archetype (e.g., grounding a flier on land). */
const DEFAULT_STYLE: Record<Archetype, MovementStyle> = {
  walking: 'prowling',
  flying: 'flapping',
  drifting: 'bobbing',
  rooted: 'swaying',
  stationary: 'still',
};

/**
 * Pick the effective archetype for a creature on the given map.
 * - Fliers on land maps are GROUNDED → walking.
 * - Everything else keeps its own archetype: a whale swims via walking, a
 *   jellyfish drifts, a kelp plant stays rooted. The creature's motion style
 *   is about HOW it moves, not where.
 */
export function effectiveArchetypeForMap(profile: EntityProfile, map: MapType): Archetype {
  if (profile.archetype === 'flying' && map === 'land') return 'walking';
  return profile.archetype;
}

/**
 * Build the InitProfile to spawn this entity on the given map.
 * Returns null if the creature cannot survive on this map.
 */
export function initProfileForMap(profile: EntityProfile, map: MapType): InitProfile | null {
  const speed = activeSpeedForMap(profile, map);
  if (speed === undefined) return null;

  const archetype = effectiveArchetypeForMap(profile, map);
  const movementStyle = archetype === profile.archetype ? profile.movementStyle : DEFAULT_STYLE[archetype];

  return {
    archetype,
    movementStyle,
    speed,
    agility: profile.agility,
    energy: profile.energy,
  };
}

// ---------------------------------------------------------------------------
// Back-compat shim for legacy call sites that only have a speed number.
// Builds a minimal InitProfile with archetype-default style and neutral stats.
// ---------------------------------------------------------------------------
import { DEFAULT_STYLE_BY_ARCHETYPE } from '../types';

export function initEntityStateLegacy(
  archetype: Archetype,
  profileSpeed: number,
  spawnX: number,
  spawnY: number,
): EntityState {
  return initEntityState(
    {
      archetype,
      movementStyle: DEFAULT_STYLE_BY_ARCHETYPE[archetype],
      speed: profileSpeed,
      agility: 5,
      energy: 5,
    },
    spawnX,
    spawnY,
  );
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
    case 'drifting':
      return updateDrifting(state, dt, world);
    case 'stationary':
      return updateStationary(state, dt, world);
  }
}

/** Re-export the profile type alias for consumers that only need structural typing. */
export type { EntityProfile };
