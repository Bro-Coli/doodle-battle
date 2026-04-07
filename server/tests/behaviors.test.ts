import { describe, it, expect } from 'vitest';
import {
  wrapPosition,
  initEntityState,
  dispatchBehavior,
} from '../../client/src/world/EntitySimulation';
import type {
  WalkingState,
  FlyingState,
  RootedState,
  SpreadingState,
  StationaryState,
} from '../../client/src/world/EntitySimulation';
import { updateWalking } from '../../client/src/world/behaviors/walkingBehavior';
import { updateFlying } from '../../client/src/world/behaviors/flyingBehavior';
import { updateRooted } from '../../client/src/world/behaviors/rootedBehavior';
import { updateSpreading } from '../../client/src/world/behaviors/spreadingBehavior';
import { updateStationary } from '../../client/src/world/behaviors/stationaryBehavior';

const world = { width: 800, height: 600 };

describe('wrapPosition', () => {
  it('wraps x below 0 to x + width', () => {
    const result = wrapPosition(-10, 50, 800, 600);
    expect(result).toEqual({ x: 790, y: 50 });
  });

  it('wraps x above width to x - width', () => {
    const result = wrapPosition(810, 50, 800, 600);
    expect(result).toEqual({ x: 10, y: 50 });
  });

  it('wraps y below 0 to y + height', () => {
    const result = wrapPosition(50, -10, 800, 600);
    expect(result).toEqual({ x: 50, y: 590 });
  });

  it('wraps y above height to y - height', () => {
    const result = wrapPosition(50, 610, 800, 600);
    expect(result).toEqual({ x: 50, y: 10 });
  });

  it('leaves values within bounds unchanged', () => {
    const result = wrapPosition(400, 300, 800, 600);
    expect(result).toEqual({ x: 400, y: 300 });
  });
});

describe('updateRooted — no drift', () => {
  it('x stays near originX after many ticks', () => {
    let state: RootedState = {
      archetype: 'rooted',
      x: 400,
      y: 300,
      originX: 400,
      swayPhase: 0,
    };
    const dt = 0.016;
    for (let i = 0; i < 1000; i++) {
      state = updateRooted(state, dt, world);
    }
    expect(state.originX).toBe(400);
    expect(Math.abs(state.x - state.originX)).toBeLessThanOrEqual(5);
  });
});

describe('updateFlying — no vertical drift', () => {
  it('bobOriginY stays near initial value after many ticks', () => {
    let state: FlyingState = {
      archetype: 'flying',
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      heading: 0, // pure horizontal, so vy starts at 0
      angularVelocity: 0,
      speed: 60,
      bobPhase: 0,
      bobOriginY: 300,
    };
    const dt = 0.016;
    for (let i = 0; i < 500; i++) {
      state = updateFlying(state, dt, world);
    }
    // With heading=0, angularVelocity=0, vy=0, bobOriginY should not change
    expect(Math.abs(state.bobOriginY - 300)).toBeLessThan(world.height);
  });
});

describe('updateSpreading', () => {
  it('isACopy suppresses pendingSpawn', () => {
    const state: SpreadingState = {
      archetype: 'spreading',
      x: 400,
      y: 300,
      spawnTimer: 0,
      spawnInterval: 4000,
      spawnRadius: 60,
      isACopy: true,
      pendingSpawn: false,
    };
    const result = updateSpreading(state, 0.02, world);
    expect(result.pendingSpawn).toBe(false);
  });

  it('parent triggers pendingSpawn when timer expires', () => {
    const state: SpreadingState = {
      archetype: 'spreading',
      x: 400,
      y: 300,
      spawnTimer: 10, // 10ms
      spawnInterval: 4000,
      spawnRadius: 60,
      isACopy: false,
      pendingSpawn: false,
    };
    // dt = 0.02 means 20ms passes, which exceeds spawnTimer of 10ms
    const result = updateSpreading(state, 0.02, world);
    expect(result.pendingSpawn).toBe(true);
  });
});

describe('updateStationary', () => {
  it('returns same state reference', () => {
    const state: StationaryState = {
      archetype: 'stationary',
      x: 400,
      y: 300,
    };
    const result = updateStationary(state, 0.016, world);
    expect(result).toBe(state);
  });
});

describe('updateWalking — state machine', () => {
  it('decrements pauseTimer when pausing', () => {
    const state: WalkingState = {
      archetype: 'walking',
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      heading: 0,
      speed: 60,
      pauseTimer: 500,
      walkTimer: 0,
    };
    const result = updateWalking(state, 0.1, world); // 100ms
    expect(result.pauseTimer).toBeLessThan(500);
  });

  it('transitions from walk to pause when walkTimer expires', () => {
    const state: WalkingState = {
      archetype: 'walking',
      x: 400,
      y: 300,
      vx: 30,
      vy: 0,
      heading: 0,
      speed: 60,
      pauseTimer: 0,
      walkTimer: 10, // 10ms
    };
    // dt = 0.02 means 20ms passes, which exceeds walkTimer of 10ms
    const result = updateWalking(state, 0.02, world);
    expect(result.pauseTimer).toBeGreaterThan(0);
  });
});
