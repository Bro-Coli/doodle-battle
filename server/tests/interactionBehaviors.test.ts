import { describe, it, expect } from 'vitest';
import {
  DETECTION_RANGE,
  FIGHT_PROXIMITY_PX,
  FIGHT_COOLDOWN_MS,
  BEFRIEND_ARRIVE_RADIUS,
  seekPosition,
  fleePosition,
  befriendPosition,
  resolveInteraction,
  applyInteractionSteering,
} from '../../client/src/world/interactionBehaviors';
import type {
  WalkingState,
  FlyingState,
  RootedState,
  StationaryState,
} from '../../client/src/world/EntitySimulation';
import type { InteractionMatrix, InteractionType } from '@crayon-world/shared/src/types';

// ---------------------------------------------------------------------------
// Helpers — minimal mock types
// ---------------------------------------------------------------------------

type MockContainer = { id: string };

function makeMatrix(entries: Array<{ entityId: string; relationships: Record<string, InteractionType> }>): InteractionMatrix {
  return { entries };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('interactionBehaviors — constants', () => {
  it('DETECTION_RANGE is 200', () => {
    expect(DETECTION_RANGE).toBe(200);
  });

  it('FIGHT_PROXIMITY_PX is 30', () => {
    expect(FIGHT_PROXIMITY_PX).toBe(30);
  });

  it('FIGHT_COOLDOWN_MS is 2000', () => {
    expect(FIGHT_COOLDOWN_MS).toBe(2000);
  });

  it('BEFRIEND_ARRIVE_RADIUS is 60', () => {
    expect(BEFRIEND_ARRIVE_RADIUS).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// seekPosition
// ---------------------------------------------------------------------------

describe('seekPosition', () => {
  it('moves from origin toward target at given speed', () => {
    const result = seekPosition(0, 0, 100, 0, 100, 1.0);
    expect(result.x).toBeCloseTo(100, 0); // moved 100px in 1s toward x=100
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.vx).toBeCloseTo(100, 1);
    expect(result.vy).toBeCloseTo(0, 1);
  });

  it('moves diagonally toward target', () => {
    const result = seekPosition(0, 0, 100, 100, 100, 1.0);
    const diagonal = 100 / Math.sqrt(2);
    expect(result.x).toBeCloseTo(diagonal, 0);
    expect(result.y).toBeCloseTo(diagonal, 0);
  });

  it('returns zero velocity when source equals target', () => {
    const result = seekPosition(50, 50, 50, 50, 100, 1.0);
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(0);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });

  it('returns zero velocity when distance < 1', () => {
    const result = seekPosition(0, 0, 0.5, 0, 100, 1.0);
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(0);
  });

  it('respects dt (half time = half distance)', () => {
    const full = seekPosition(0, 0, 200, 0, 100, 1.0);
    const half = seekPosition(0, 0, 200, 0, 100, 0.5);
    expect(half.x).toBeCloseTo(full.x / 2, 1);
  });
});

// ---------------------------------------------------------------------------
// fleePosition
// ---------------------------------------------------------------------------

describe('fleePosition', () => {
  it('moves away from target (x-axis)', () => {
    // Target is to the right; entity should move left
    const result = fleePosition(50, 50, 100, 50, 100, 1.0);
    expect(result.x).toBeLessThan(50);
    expect(result.vx).toBeLessThan(0);
  });

  it('moves away from target (y-axis)', () => {
    // Target is below; entity should move up
    const result = fleePosition(50, 50, 50, 150, 100, 1.0);
    expect(result.y).toBeLessThan(50);
    expect(result.vy).toBeLessThan(0);
  });

  it('moves away diagonally', () => {
    const result = fleePosition(100, 100, 200, 200, 100, 1.0);
    expect(result.x).toBeLessThan(100);
    expect(result.y).toBeLessThan(100);
  });

  it('returns zero velocity when source equals target', () => {
    const result = fleePosition(50, 50, 50, 50, 100, 1.0);
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// befriendPosition
// ---------------------------------------------------------------------------

describe('befriendPosition', () => {
  it('moves toward target at full speed when far away', () => {
    // Distance = 200, arriveRadius = 60 => full speed
    const result = befriendPosition(0, 0, 200, 0, 100, 1.0);
    const seekResult = seekPosition(0, 0, 200, 0, 100, 1.0);
    // x should match seek (full speed)
    expect(result.x).toBeCloseTo(seekResult.x, 0);
  });

  it('moves toward target at reduced speed when close (within arriveRadius)', () => {
    // Distance = 30, arriveRadius = 60 => speed scaled to 30/60 = 0.5
    const seek = seekPosition(0, 0, 30, 0, 100, 1.0);
    const befriend = befriendPosition(0, 0, 30, 0, 100, 1.0);
    // befriend x should be closer to 0 than seek x (slower movement)
    expect(befriend.x).toBeLessThan(seek.x);
    expect(befriend.x).toBeGreaterThan(0); // still moves toward target
  });

  it('uses custom arriveRadius', () => {
    // With smaller arriveRadius=30, at distance=30 we're right at boundary => effectively full speed
    const seek = seekPosition(0, 0, 30, 0, 100, 1.0);
    const befriend = befriendPosition(0, 0, 30, 0, 100, 1.0, 30);
    // At exactly arriveRadius, factor = dist/arriveRadius = 1, so speed = full speed
    expect(befriend.x).toBeCloseTo(seek.x, 0);
  });

  it('returns zero velocity when at same position', () => {
    const result = befriendPosition(50, 50, 50, 50, 100, 1.0);
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveInteraction
// ---------------------------------------------------------------------------

describe('resolveInteraction', () => {
  it('returns null when entity not in matrix', () => {
    const selfC: MockContainer = { id: 'self' };
    const otherC: MockContainer = { id: 'other' };

    const entityStates = new Map<MockContainer, WalkingState>();
    entityStates.set(selfC, { archetype: 'walking', x: 0, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });
    entityStates.set(otherC, { archetype: 'walking', x: 50, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });

    const entityProfiles = new Map<MockContainer, { name: string }>();
    entityProfiles.set(selfC, { name: 'Wolf' });
    entityProfiles.set(otherC, { name: 'Sheep' });

    const dyingEntities = new Set<MockContainer>();

    // Empty matrix — self not present
    const matrix = makeMatrix([]);

    const nameIdMap = new Map<string, string>([['Wolf', '1'], ['Sheep', '2']]);

    const result = resolveInteraction(
      selfC,
      entityStates as Map<MockContainer, any>,
      entityProfiles as Map<MockContainer, any>,
      dyingEntities,
      matrix,
      nameIdMap,
      200,
    );

    expect(result).toBeNull();
  });

  it('returns null when all relationships are ignore', () => {
    const selfC: MockContainer = { id: 'self' };
    const otherC: MockContainer = { id: 'other' };

    const entityStates = new Map<MockContainer, WalkingState>();
    entityStates.set(selfC, { archetype: 'walking', x: 0, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });
    entityStates.set(otherC, { archetype: 'walking', x: 50, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });

    const entityProfiles = new Map<MockContainer, { name: string }>();
    entityProfiles.set(selfC, { name: 'Wolf' });
    entityProfiles.set(otherC, { name: 'Sheep' });

    const dyingEntities = new Set<MockContainer>();

    const matrix = makeMatrix([
      { entityId: '1', relationships: { '2': 'ignore' } },
      { entityId: '2', relationships: { '1': 'ignore' } },
    ]);

    const nameIdMap = new Map<string, string>([['Wolf', '1'], ['Sheep', '2']]);

    const result = resolveInteraction(
      selfC,
      entityStates as Map<MockContainer, any>,
      entityProfiles as Map<MockContainer, any>,
      dyingEntities,
      matrix,
      nameIdMap,
      200,
    );

    expect(result).toBeNull();
  });

  it('returns null when target is out of detection range', () => {
    const selfC: MockContainer = { id: 'self' };
    const otherC: MockContainer = { id: 'other' };

    const entityStates = new Map<MockContainer, WalkingState>();
    entityStates.set(selfC, { archetype: 'walking', x: 0, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });
    entityStates.set(otherC, { archetype: 'walking', x: 500, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });

    const entityProfiles = new Map<MockContainer, { name: string }>();
    entityProfiles.set(selfC, { name: 'Wolf' });
    entityProfiles.set(otherC, { name: 'Sheep' });

    const dyingEntities = new Set<MockContainer>();

    const matrix = makeMatrix([
      { entityId: '1', relationships: { '2': 'chase' } },
      { entityId: '2', relationships: { '1': 'flee' } },
    ]);

    const nameIdMap = new Map<string, string>([['Wolf', '1'], ['Sheep', '2']]);

    const result = resolveInteraction(
      selfC,
      entityStates as Map<MockContainer, any>,
      entityProfiles as Map<MockContainer, any>,
      dyingEntities,
      matrix,
      nameIdMap,
      200, // detection range = 200, target at x=500 => distance=500 > 200
    );

    expect(result).toBeNull();
  });

  it('returns target when within range with non-ignore relationship', () => {
    const selfC: MockContainer = { id: 'self' };
    const otherC: MockContainer = { id: 'other' };

    const entityStates = new Map<MockContainer, WalkingState>();
    entityStates.set(selfC, { archetype: 'walking', x: 0, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });
    entityStates.set(otherC, { archetype: 'walking', x: 100, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });

    const entityProfiles = new Map<MockContainer, { name: string }>();
    entityProfiles.set(selfC, { name: 'Wolf' });
    entityProfiles.set(otherC, { name: 'Sheep' });

    const dyingEntities = new Set<MockContainer>();

    const matrix = makeMatrix([
      { entityId: '1', relationships: { '2': 'chase' } },
      { entityId: '2', relationships: { '1': 'flee' } },
    ]);

    const nameIdMap = new Map<string, string>([['Wolf', '1'], ['Sheep', '2']]);

    const result = resolveInteraction(
      selfC,
      entityStates as Map<MockContainer, any>,
      entityProfiles as Map<MockContainer, any>,
      dyingEntities,
      matrix,
      nameIdMap,
      200,
    );

    expect(result).not.toBeNull();
    expect(result!.type).toBe('chase');
    expect(result!.targetContainer).toBe(otherC);
    expect(result!.distance).toBeCloseTo(100, 1);
  });

  it('skips dying entities', () => {
    const selfC: MockContainer = { id: 'self' };
    const otherC: MockContainer = { id: 'other' };

    const entityStates = new Map<MockContainer, WalkingState>();
    entityStates.set(selfC, { archetype: 'walking', x: 0, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });
    entityStates.set(otherC, { archetype: 'walking', x: 100, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });

    const entityProfiles = new Map<MockContainer, { name: string }>();
    entityProfiles.set(selfC, { name: 'Wolf' });
    entityProfiles.set(otherC, { name: 'Sheep' });

    // Mark other entity as dying
    const dyingEntities = new Set<MockContainer>([otherC]);

    const matrix = makeMatrix([
      { entityId: '1', relationships: { '2': 'chase' } },
      { entityId: '2', relationships: { '1': 'flee' } },
    ]);

    const nameIdMap = new Map<string, string>([['Wolf', '1'], ['Sheep', '2']]);

    const result = resolveInteraction(
      selfC,
      entityStates as Map<MockContainer, any>,
      entityProfiles as Map<MockContainer, any>,
      dyingEntities,
      matrix,
      nameIdMap,
      200,
    );

    expect(result).toBeNull();
  });

  it('picks nearest target when multiple qualify', () => {
    const selfC: MockContainer = { id: 'self' };
    const nearC: MockContainer = { id: 'near' };
    const farC: MockContainer = { id: 'far' };

    const entityStates = new Map<MockContainer, WalkingState>();
    entityStates.set(selfC, { archetype: 'walking', x: 0, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });
    entityStates.set(nearC, { archetype: 'walking', x: 80, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });
    entityStates.set(farC, { archetype: 'walking', x: 150, y: 0, vx: 0, vy: 0, heading: 0, speed: 60, pauseTimer: 0, walkTimer: 2000 });

    const entityProfiles = new Map<MockContainer, { name: string }>();
    entityProfiles.set(selfC, { name: 'Wolf' });
    entityProfiles.set(nearC, { name: 'Sheep' });
    entityProfiles.set(farC, { name: 'Rabbit' });

    const dyingEntities = new Set<MockContainer>();

    const matrix = makeMatrix([
      { entityId: '1', relationships: { '2': 'chase', '3': 'chase' } },
      { entityId: '2', relationships: { '1': 'flee' } },
      { entityId: '3', relationships: { '1': 'flee' } },
    ]);

    const nameIdMap = new Map<string, string>([['Wolf', '1'], ['Sheep', '2'], ['Rabbit', '3']]);

    const result = resolveInteraction(
      selfC,
      entityStates as Map<MockContainer, any>,
      entityProfiles as Map<MockContainer, any>,
      dyingEntities,
      matrix,
      nameIdMap,
      200,
    );

    expect(result).not.toBeNull();
    expect(result!.targetContainer).toBe(nearC);
    expect(result!.distance).toBeCloseTo(80, 1);
  });
});

// ---------------------------------------------------------------------------
// applyInteractionSteering
// ---------------------------------------------------------------------------

describe('applyInteractionSteering', () => {
  const walkingState: WalkingState = {
    archetype: 'walking',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    speed: 80,
    pauseTimer: 0,
    walkTimer: 2000,
  };

  const targetWalkingState: WalkingState = {
    archetype: 'walking',
    x: 100,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    speed: 80,
    pauseTimer: 0,
    walkTimer: 2000,
  };

  it('chase uses seekPosition at entity speed', () => {
    const resolved = { type: 'chase' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(walkingState, resolved, targetWalkingState, 1.0);
    const expectedSeek = seekPosition(0, 0, 100, 0, 80, 1.0);
    expect(result.x).toBeCloseTo(expectedSeek.x, 1);
  });

  it('flee uses fleePosition at entity speed * 1.1', () => {
    const resolved = { type: 'flee' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(walkingState, resolved, targetWalkingState, 1.0);
    const expectedFlee = fleePosition(0, 0, 100, 0, 80 * 1.1, 1.0);
    expect(result.x).toBeCloseTo(expectedFlee.x, 1);
  });

  it('fight uses seekPosition at entity speed', () => {
    const resolved = { type: 'fight' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(walkingState, resolved, targetWalkingState, 1.0);
    const expectedSeek = seekPosition(0, 0, 100, 0, 80, 1.0);
    expect(result.x).toBeCloseTo(expectedSeek.x, 1);
  });

  it('befriend uses befriendPosition at entity speed * 0.5', () => {
    const resolved = { type: 'befriend' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(walkingState, resolved, targetWalkingState, 1.0);
    const expectedBefriend = befriendPosition(0, 0, 100, 0, 80 * 0.5, 1.0);
    expect(result.x).toBeCloseTo(expectedBefriend.x, 1);
  });

  it('preserves archetype-specific fields', () => {
    const resolved = { type: 'chase' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(walkingState, resolved, targetWalkingState, 1.0);
    const walkResult = result as WalkingState;
    expect(walkResult.archetype).toBe('walking');
    expect(walkResult.speed).toBe(80);
    expect(walkResult.pauseTimer).toBe(0);
    expect(walkResult.walkTimer).toBe(2000);
    expect(walkResult.heading).toBe(0);
  });

  it('updates vx and vy for walking state', () => {
    const resolved = { type: 'chase' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(walkingState, resolved, targetWalkingState, 1.0);
    const walkResult = result as WalkingState;
    expect(walkResult.vx).toBeCloseTo(80, 0); // chasing right at speed=80
    expect(walkResult.vy).toBeCloseTo(0, 1);
  });

  it('uses default speed 80 for rooted state (no speed field)', () => {
    const rootedState: RootedState = {
      archetype: 'rooted',
      x: 0,
      y: 0,
      originX: 0,
      swayPhase: 0,
    };
    const targetState: StationaryState = { archetype: 'stationary', x: 100, y: 0 };
    const resolved = { type: 'chase' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(rootedState, resolved, targetState, 1.0);
    const seekResult = seekPosition(0, 0, 100, 0, 80, 1.0);
    expect(result.x).toBeCloseTo(seekResult.x, 1);
  });

  it('for flying state, updates vx and vy', () => {
    const flyingState: FlyingState = {
      archetype: 'flying',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      heading: 0,
      angularVelocity: 0,
      speed: 100,
      bobPhase: 0,
      bobOriginY: 0,
    };
    const targetState: StationaryState = { archetype: 'stationary', x: 100, y: 0 };
    const resolved = { type: 'chase' as InteractionType, targetContainer: {}, distance: 100 };
    const result = applyInteractionSteering(flyingState, resolved, targetState, 1.0);
    const flyResult = result as FlyingState;
    expect(flyResult.vx).toBeCloseTo(100, 0);
    expect(flyResult.vy).toBeCloseTo(0, 1);
  });
});
