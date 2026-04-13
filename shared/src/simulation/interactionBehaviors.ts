import type { EntityState } from './EntitySimulation';
import type { InteractionMatrix, InteractionType } from '@crayon-world/shared/src/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Detection range as fraction of world diagonal (0.3 = 30% of diagonal) */
export const DETECTION_RANGE_FRACTION = 0.3;
/** Fight proximity as fraction of world diagonal */
export const FIGHT_PROXIMITY_FRACTION = 0.02;
export const FIGHT_COOLDOWN_MS = 2000;
/** Befriend arrival damping radius as fraction of world diagonal */
export const BEFRIEND_ARRIVE_FRACTION = 0.05;
/** Chase/fight stop radius — chaser holds this distance so the target isn't overlapped. */
export const CHASE_STOP_FRACTION = 0.018;
/** Befriend stop radius — companions settle here instead of orbiting each other. */
export const BEFRIEND_STOP_FRACTION = 0.012;

// ---------------------------------------------------------------------------
// Steering result type
// ---------------------------------------------------------------------------

export interface SteeringResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ---------------------------------------------------------------------------
// Resolved interaction type (generic container T)
// ---------------------------------------------------------------------------

export interface ResolvedInteraction<T> {
  type: InteractionType;
  targetContainer: T;
  distance: number;
}

// ---------------------------------------------------------------------------
// Pure steering functions
// ---------------------------------------------------------------------------

/**
 * Move from (sx, sy) toward (tx, ty) at the given speed (px/s) scaled by dt (seconds).
 * Returns {x, y, vx, vy}. When distance < 1, returns original position with zero velocity.
 */
export function seekPosition(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
): SteeringResult {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) {
    return { x: sx, y: sy, vx: 0, vy: 0 };
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const vx = nx * speed;
  const vy = ny * speed;

  return {
    x: sx + vx * dt,
    y: sy + vy * dt,
    vx,
    vy,
  };
}

/**
 * Move from (sx, sy) AWAY from (tx, ty) at the given speed (px/s) scaled by dt.
 * Returns {x, y, vx, vy}. When distance < 1, returns original position with zero velocity.
 */
export function fleePosition(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
): SteeringResult {
  const dx = sx - tx; // reversed direction
  const dy = sy - ty;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) {
    return { x: sx, y: sy, vx: 0, vy: 0 };
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const vx = nx * speed;
  const vy = ny * speed;

  return {
    x: sx + vx * dt,
    y: sy + vy * dt,
    vx,
    vy,
  };
}

/**
 * Move toward (tx, ty) like seekPosition but damp speed linearly when within arriveRadius.
 * At distance >= arriveRadius: full speed. At distance = 0: speed = 0.
 * Returns {x, y, vx, vy}.
 */
export function befriendPosition(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
  arriveRadius: number,
): SteeringResult {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) {
    return { x: sx, y: sy, vx: 0, vy: 0 };
  }

  // Linear damping within arriveRadius
  const factor = dist < arriveRadius ? dist / arriveRadius : 1;
  const effectiveSpeed = speed * factor;

  const nx = dx / dist;
  const ny = dy / dist;
  const vx = nx * effectiveSpeed;
  const vy = ny * effectiveSpeed;

  return {
    x: sx + vx * dt,
    y: sy + vy * dt,
    vx,
    vy,
  };
}

// ---------------------------------------------------------------------------
// Interaction resolution
// ---------------------------------------------------------------------------

/**
 * Minimal profile shape needed for resolveInteraction — just requires name.
 */
interface HasName {
  name: string;
}

/**
 * Find the nearest non-ignore entity within detectionRange for selfContainer.
 *
 * @param selfContainer       The entity doing the searching
 * @param entityStates        Map from container to EntityState (has x, y)
 * @param entityProfiles      Map from container to EntityProfile (has name)
 * @param dyingEntities       Set of containers currently dying (skip as targets)
 * @param matrix              InteractionMatrix from AI
 * @param nameIdMap           Map from entity name -> integer ID string
 * @param detectionRange      Max pixel distance to consider
 *
 * @returns ResolvedInteraction or null
 */
export function resolveInteraction<T>(
  selfContainer: T,
  entityStates: Map<T, EntityState>,
  entityProfiles: Map<T, HasName>,
  dyingEntities: Set<T>,
  matrix: InteractionMatrix,
  nameIdMap: Map<string, string>,
  detectionRange: number,
  teamLookup?: Map<T, string>,
): ResolvedInteraction<T> | null {
  const selfProfile = entityProfiles.get(selfContainer);
  if (!selfProfile) return null;

  const selfState = entityStates.get(selfContainer);
  if (!selfState) return null;

  const selfId = nameIdMap.get(selfProfile.name);
  const selfEntry =
    selfId !== undefined ? matrix.entries.find((e) => e.entityId === selfId) : undefined;

  const selfTeam = teamLookup?.get(selfContainer);

  let nearestDistance = Infinity;
  let nearestContainer: T | null = null;
  let nearestType: InteractionType | null = null;

  for (const [container, state] of entityStates) {
    // Skip self
    if (container === selfContainer) continue;

    // Skip dying entities
    if (dyingEntities.has(container)) continue;

    const profile = entityProfiles.get(container);
    if (!profile) continue;

    const otherId = nameIdMap.get(profile.name);
    const matrixRel =
      otherId !== undefined ? selfEntry?.relationships[otherId] : undefined;
    const otherTeam = teamLookup?.get(container);

    let relType: InteractionType | undefined;
    if (selfTeam && otherTeam && selfTeam === otherTeam) {
      // Same team: never hostile. Downgrade chase/fight to ignore, keep
      // befriend/flee so symbiotic behaviors still play out.
      relType = matrixRel === 'chase' || matrixRel === 'fight' ? 'ignore' : matrixRel;
    } else if (
      selfTeam &&
      otherTeam &&
      selfTeam !== otherTeam &&
      profile.name === selfProfile.name
    ) {
      // Opposing teams AND same species: force fight. Dedup collapses same-name
      // entities in the matrix, so without this they would resolve to ignore.
      relType = 'fight';
    } else {
      // Different teams with different species, or no team info: trust matrix.
      relType = matrixRel;
    }

    if (!relType || relType === 'ignore') continue;

    // Calculate distance
    const dx = state.x - selfState.x;
    const dy = state.y - selfState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > detectionRange) continue;

    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestContainer = container;
      nearestType = relType;
    }
  }

  if (nearestContainer === null || nearestType === null) return null;

  return {
    type: nearestType,
    targetContainer: nearestContainer,
    distance: nearestDistance,
  };
}

// ---------------------------------------------------------------------------
// Steering application
// ---------------------------------------------------------------------------

/**
 * Unit vector for a fleeing entity whose position coincides with the threat.
 * Prefers current velocity, then heading, then a deterministic default.
 */
function getFleeFallback(state: EntityState): { x: number; y: number } {
  const vx = 'vx' in state ? (state as { vx: number }).vx : 0;
  const vy = 'vy' in state ? (state as { vy: number }).vy : 0;
  const vMag = Math.sqrt(vx * vx + vy * vy);
  if (vMag > 0.01) return { x: vx / vMag, y: vy / vMag };

  if ('heading' in state) {
    const h = (state as { heading: number }).heading;
    return { x: Math.cos(h), y: Math.sin(h) };
  }

  return { x: 1, y: 0 };
}

/**
 * Apply interaction steering to an entity state, returning an updated state spread.
 * Preserves all archetype-specific fields.
 *
 * Speed extraction: uses state.speed if present (walking/flying), else defaults to 80.
 */
export function applyInteractionSteering<T>(
  state: EntityState,
  resolved: ResolvedInteraction<T>,
  targetState: EntityState,
  dt: number,
  worldDiagonal: number,
): EntityState {
  // Extract speed — walking and flying have speed, others don't
  const speed = 'speed' in state && typeof (state as { speed?: unknown }).speed === 'number'
    ? (state as { speed: number }).speed
    : 80;

  let steering: SteeringResult;

  const chaseStopRadius = worldDiagonal * CHASE_STOP_FRACTION;
  const befriendStopRadius = worldDiagonal * BEFRIEND_STOP_FRACTION;

  switch (resolved.type) {
    case 'chase':
    case 'fight':
      // Hold a small gap so the chaser doesn't stack on the target — gives the
      // fleeing/defending entity a real offset direction to work with.
      if (resolved.distance <= chaseStopRadius) {
        steering = { x: state.x, y: state.y, vx: 0, vy: 0 };
      } else {
        steering = seekPosition(state.x, state.y, targetState.x, targetState.y, speed, dt);
      }
      break;
    case 'flee': {
      // When coincident with the threat, fleePosition would return zero velocity
      // and the entity freezes. Fall back to the entity's current heading/velocity
      // so it commits to *some* direction and escapes.
      const dx = state.x - targetState.x;
      const dy = state.y - targetState.y;
      if (dx * dx + dy * dy < 1) {
        const fallback = getFleeFallback(state);
        const fleeSpeed = speed * 1.1;
        steering = {
          x: state.x + fallback.x * fleeSpeed * dt,
          y: state.y + fallback.y * fleeSpeed * dt,
          vx: fallback.x * fleeSpeed,
          vy: fallback.y * fleeSpeed,
        };
      } else {
        steering = fleePosition(state.x, state.y, targetState.x, targetState.y, speed * 1.1, dt);
      }
      break;
    }
    case 'befriend':
      // Settle near the companion rather than orbiting it. Two mutual befrienders
      // would otherwise chase each other's small motion forever.
      if (resolved.distance <= befriendStopRadius) {
        steering = { x: state.x, y: state.y, vx: 0, vy: 0 };
      } else {
        steering = befriendPosition(state.x, state.y, targetState.x, targetState.y, speed * 0.5, dt, worldDiagonal * BEFRIEND_ARRIVE_FRACTION);
      }
      break;
    case 'ignore':
      // No steering for ignore
      return state;
  }

  // Build updated state — spread all fields, override x, y, and vx/vy if applicable
  const hasVelocity = 'vx' in state && 'vy' in state;

  if (hasVelocity) {
    return {
      ...state,
      x: steering.x,
      y: steering.y,
      vx: steering.vx,
      vy: steering.vy,
    } as EntityState;
  }

  return {
    ...state,
    x: steering.x,
    y: steering.y,
  } as EntityState;
}
