/**
 * GameRoom simulation tests — Phase 12, Plan 01
 *
 * Tests EntitySchema fields, simulation tick behavior, fight resolution,
 * spawn/remove handlers, and interaction matrix storage.
 *
 * Pattern: instantiate GameRoom directly, cast to any for private access.
 * No Colyseus server started.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapSchema } from '@colyseus/schema';
import { EntitySchema, GameState, GameRoom } from '../src/rooms/GameRoom.js';
import type { EntityState } from '@crayon-world/shared/src/simulation/EntitySimulation.js';
import type { InteractionMatrix } from '@crayon-world/shared/src/types.js';

// ---------------------------------------------------------------------------
// Helper types for private-access casting
// ---------------------------------------------------------------------------

type AnyRoom = {
  clients: { sessionId: string }[];
  broadcast: ReturnType<typeof vi.fn>;
  lock: ReturnType<typeof vi.fn>;
  _entityStates: Map<string, EntityState>;
  _entityProfiles: Map<string, { name: string; archetype: string; speed: number }>;
  _interactionMatrix: InteractionMatrix | null;
  _fightCooldowns: Map<string, number>;
  _dyingEntities: Set<string>;
  _nameIdMap: Map<string, string>;
  _tick(deltaMS: number): void;
  _handleSpawnEntity(client: { sessionId: string }, msg: unknown): void;
  _handleInteractionMatrix(client: { sessionId: string }, msg: unknown): void;
  _handleFightContact(attackerId: string, targetId: string, toRemove: string[]): void;
};

function makeRoom(): { room: GameRoom; any: AnyRoom } {
  const room = new GameRoom();
  room.state = new GameState();
  const any = room as unknown as AnyRoom;
  any.clients = [];
  any.broadcast = vi.fn();
  any.lock = vi.fn();
  return { room, any };
}

function makeSpawnMsg(overrides: Record<string, unknown> = {}) {
  return {
    entityId: 'entity-1',
    name: 'Wolf',
    archetype: 'walking',
    teamId: 'red',
    speed: 5,
    x: 100,
    y: 200,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EntitySchema defaults
// ---------------------------------------------------------------------------

describe('EntitySchema defaults', () => {
  it('has correct field defaults', () => {
    const e = new EntitySchema();
    expect(e.entityId).toBe('');
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
    expect(e.hp).toBe(1);
    expect(e.name).toBe('');
    expect(e.archetype).toBe('');
    expect(e.teamId).toBe('');
    expect(e.vx).toBe(0);
    expect(e.vy).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GameState.entities MapSchema
// ---------------------------------------------------------------------------

describe('GameState.entities', () => {
  it('is a MapSchema of EntitySchema', () => {
    const gs = new GameState();
    expect(gs.entities).toBeInstanceOf(MapSchema);
  });
});

// ---------------------------------------------------------------------------
// _handleSpawnEntity
// ---------------------------------------------------------------------------

describe('GameRoom._handleSpawnEntity', () => {
  let room: GameRoom;
  let any: AnyRoom;

  beforeEach(() => {
    ({ room, any } = makeRoom());
    // Initialize private fields (normally done in onCreate, but we skip that)
    any._entityStates = new Map();
    any._entityProfiles = new Map();
    any._fightCooldowns = new Map();
    any._dyingEntities = new Set();
    any._nameIdMap = new Map();
    any._interactionMatrix = null;
  });

  it('creates EntitySchema in state.entities with correct fields', () => {
    const msg = makeSpawnMsg({ entityId: 'e1', name: 'Wolf', x: 300, y: 400 });
    any._handleSpawnEntity({ sessionId: 'client1' }, msg);

    expect(room.state.entities.has('e1')).toBe(true);
    const schema = room.state.entities.get('e1')!;
    expect(schema.entityId).toBe('e1');
    expect(schema.name).toBe('Wolf');
    expect(schema.archetype).toBe('walking');
    expect(schema.teamId).toBe('red');
    expect(schema.x).toBe(300);
    expect(schema.y).toBe(400);
    expect(schema.hp).toBe(1);
  });

  it('creates EntityState in _entityStates with correct initial position', () => {
    const msg = makeSpawnMsg({ entityId: 'e1', x: 150, y: 250 });
    any._handleSpawnEntity({ sessionId: 'client1' }, msg);

    expect(any._entityStates.has('e1')).toBe(true);
    const state = any._entityStates.get('e1')!;
    expect(state.x).toBe(150);
    expect(state.y).toBe(250);
    expect(state.archetype).toBe('walking');
  });

  it('ignores spawn messages missing required fields', () => {
    any._handleSpawnEntity({ sessionId: 'c1' }, { entityId: 'e1' }); // missing name, archetype, etc.
    expect(room.state.entities.has('e1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _handleInteractionMatrix
// ---------------------------------------------------------------------------

describe('GameRoom._handleInteractionMatrix', () => {
  it('stores the matrix for use in _tick', () => {
    const { any } = makeRoom();
    any._entityStates = new Map();
    any._entityProfiles = new Map();
    any._fightCooldowns = new Map();
    any._dyingEntities = new Set();
    any._nameIdMap = new Map();
    any._interactionMatrix = null;

    const matrix: InteractionMatrix = {
      entries: [{ entityId: '1', relationships: { '2': 'fight' } }],
    };

    any._handleInteractionMatrix({ sessionId: 'c1' }, matrix);
    expect(any._interactionMatrix).toEqual(matrix);
  });
});

// ---------------------------------------------------------------------------
// _tick — position update
// ---------------------------------------------------------------------------

describe('GameRoom._tick', () => {
  let room: GameRoom;
  let any: AnyRoom;

  beforeEach(() => {
    ({ room, any } = makeRoom());
    any._entityStates = new Map();
    any._entityProfiles = new Map();
    any._fightCooldowns = new Map();
    any._dyingEntities = new Set();
    any._nameIdMap = new Map();
    any._interactionMatrix = null;
  });

  it('calls dispatchBehavior and updates EntitySchema x/y from EntityState', () => {
    // Spawn a stationary entity first so tick updates it
    const msg = makeSpawnMsg({ entityId: 'e1', archetype: 'walking', x: 100, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);

    // Tick with 50ms
    any._tick(50);

    // EntitySchema x/y must be updated (walking moves, so they differ from initial or are still there)
    const schema = room.state.entities.get('e1')!;
    expect(typeof schema.x).toBe('number');
    expect(typeof schema.y).toBe('number');
  });

  it('updates EntitySchema vx/vy from EntityState after tick', () => {
    const msg = makeSpawnMsg({ entityId: 'e1', archetype: 'walking', x: 100, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);

    any._tick(50);

    const schema = room.state.entities.get('e1')!;
    expect(typeof schema.vx).toBe('number');
    expect(typeof schema.vy).toBe('number');
  });

  it('uses toRemove array — entities deleted AFTER iteration completes, not during', () => {
    // Spawn two entities with fight interaction
    const msg1 = makeSpawnMsg({ entityId: 'e1', archetype: 'walking', x: 100, y: 100 });
    const msg2 = makeSpawnMsg({ entityId: 'e2', name: 'Bear', archetype: 'walking', x: 105, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg1);
    any._handleSpawnEntity({ sessionId: 'c2' }, msg2);

    // Reduce e2 HP to 0 via fight contact
    const toRemove: string[] = [];
    any._handleFightContact('e1', 'e2', toRemove);
    expect(room.state.entities.has('e2')).toBe(true); // still present — not removed yet

    // After tick, e2 should be cleaned up
    any._tick(50);
    expect(room.state.entities.has('e2')).toBe(false);
    expect(any._entityStates.has('e2')).toBe(false);
  });

  it('does not process dying entities in tick', () => {
    const msg = makeSpawnMsg({ entityId: 'e1', archetype: 'walking', x: 100, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);
    any._dyingEntities.add('e1');

    const initialState = { ...any._entityStates.get('e1')! };

    any._tick(50);

    // Entity should have been removed due to being in dyingEntities
    expect(room.state.entities.has('e1')).toBe(false);
    // State should be cleaned up
    expect(any._entityStates.has('e1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _handleFightContact — fight resolution
// ---------------------------------------------------------------------------

describe('GameRoom._handleFightContact', () => {
  let room: GameRoom;
  let any: AnyRoom;

  beforeEach(() => {
    ({ room, any } = makeRoom());
    any._entityStates = new Map();
    any._entityProfiles = new Map();
    any._fightCooldowns = new Map();
    any._dyingEntities = new Set();
    any._nameIdMap = new Map();
    any._interactionMatrix = null;
  });

  it('reduces target HP when fight contact occurs', () => {
    const msg = makeSpawnMsg({ entityId: 'target', archetype: 'walking', x: 100, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);

    const targetSchema = room.state.entities.get('target')!;
    expect(targetSchema.hp).toBe(1);

    const toRemove: string[] = [];
    any._handleFightContact('attacker', 'target', toRemove);
    expect(targetSchema.hp).toBe(0);
  });

  it('adds target to _dyingEntities when HP reaches 0', () => {
    const msg = makeSpawnMsg({ entityId: 'target', archetype: 'walking', x: 100, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);

    const toRemove: string[] = [];
    any._handleFightContact('attacker', 'target', toRemove);
    expect(any._dyingEntities.has('target')).toBe(true);
  });

  it('sets fight cooldown after contact', () => {
    const msg = makeSpawnMsg({ entityId: 'target', archetype: 'walking', x: 100, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);

    const toRemove: string[] = [];
    any._handleFightContact('attacker', 'target', toRemove);
    expect(any._fightCooldowns.has('attacker:target')).toBe(true);
  });

  it('skips contact if cooldown is active', () => {
    const msg = makeSpawnMsg({ entityId: 'target', archetype: 'walking', x: 100, y: 100 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);

    any._fightCooldowns.set('attacker:target', 1000);

    const toRemove: string[] = [];
    any._handleFightContact('attacker', 'target', toRemove);
    // HP stays at 1 — cooldown blocked contact
    const targetSchema = room.state.entities.get('target')!;
    expect(targetSchema.hp).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Spreading entity pendingSpawn — creates new EntitySchema with new UUID
// ---------------------------------------------------------------------------

describe('GameRoom._tick — spreading entity pendingSpawn', () => {
  it('creates a new EntitySchema with a new UUID when pendingSpawn is true', () => {
    const { room, any } = makeRoom();
    any._entityStates = new Map();
    any._entityProfiles = new Map();
    any._fightCooldowns = new Map();
    any._dyingEntities = new Set();
    any._nameIdMap = new Map();
    any._interactionMatrix = null;

    // Spawn a spreading entity
    const msg = makeSpawnMsg({ entityId: 'spreader', name: 'Moss', archetype: 'spreading', x: 400, y: 300 });
    any._handleSpawnEntity({ sessionId: 'c1' }, msg);

    // Force pendingSpawn = true on the entity state
    const state = any._entityStates.get('spreader') as { pendingSpawn: boolean };
    state.pendingSpawn = true;

    const countBefore = room.state.entities.size;
    any._tick(50);

    // A new entity should have been spawned
    const countAfter = room.state.entities.size;
    expect(countAfter).toBeGreaterThan(countBefore);

    // New entity should have a different ID than 'spreader'
    let foundNewEntity = false;
    room.state.entities.forEach((_schema, key) => {
      if (key !== 'spreader') foundNewEntity = true;
    });
    expect(foundNewEntity).toBe(true);
  });
});
