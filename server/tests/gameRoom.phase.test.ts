/**
 * Phase lifecycle and drawing relay tests for GameRoom.
 *
 * Pattern: direct instantiation, cast to AnyRoom for private methods,
 * mock recognizeDrawingInternal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameState, PlayerSchema, GameRoom, EntitySchema } from '../src/rooms/GameRoom.js';

// Mock recognizeDrawingInternal so tests don't hit the API
vi.mock('../src/recognition/recognizeDrawingInternal.js', () => ({
  recognizeDrawingInternal: vi.fn().mockResolvedValue({
    name: 'Test Wolf',
    archetype: 'walking',
    traits: ['fierce'],
    role: 'Predator',
    speed: 5,
  }),
}));

// ---------------------------------------------------------------------------
// Type helper — exposes private methods for testing
// ---------------------------------------------------------------------------

type AnyRoom = {
  clients: { sessionId: string }[];
  broadcast: ReturnType<typeof vi.fn>;
  lock: ReturnType<typeof vi.fn>;
  _handleStartGame(client: { sessionId: string }): void;
  _handleToggleReady(client: { sessionId: string }, msg: unknown): void;
  _handleSubmitDrawing(client: { sessionId: string }, msg: unknown): Promise<void>;
  _advancePhase(): void;
  _allPlayersSubmitted(): boolean;
  _tick(deltaMS: number): void;
};

function makeMockClient(sessionId: string) {
  return { sessionId };
}

function setupRoom() {
  const room = new GameRoom();
  room.state = new GameState();
  const anyRoom = room as unknown as AnyRoom;
  anyRoom.clients = [];
  anyRoom.broadcast = vi.fn();
  anyRoom.lock = vi.fn();
  return { room, anyRoom };
}

function addPlayer(room: GameRoom, anyRoom: AnyRoom, sessionId: string, name: string, team = 'red') {
  const client = makeMockClient(sessionId);
  anyRoom.clients.push(client);
  room.onJoin(client as never, { name });
  // Override auto-assigned team if needed
  room.state.players.get(sessionId)!.team = team;
  return client;
}

// ---------------------------------------------------------------------------
// Schema defaults
// ---------------------------------------------------------------------------

describe('Schema defaults', () => {
  it('GameState.currentPhase defaults to idle', () => {
    const gs = new GameState();
    expect(gs.currentPhase).toBe('idle');
  });

  it('GameState.phaseTimer defaults to 0', () => {
    const gs = new GameState();
    expect(gs.phaseTimer).toBe(0);
  });

  it('PlayerSchema.hasSubmittedDrawing defaults to false', () => {
    const p = new PlayerSchema();
    expect(p.hasSubmittedDrawing).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _handleStartGame sets phase
// ---------------------------------------------------------------------------

describe('_handleStartGame phase setup', () => {
  it('sets currentPhase to draw and phaseTimer to 60', () => {
    const { room, anyRoom } = setupRoom();
    const host = addPlayer(room, anyRoom, 'host', 'Host', 'red');
    addPlayer(room, anyRoom, 'guest', 'Guest', 'blue');
    room.state.players.get('host')!.ready = true;
    room.state.players.get('guest')!.ready = true;

    anyRoom._handleStartGame(host);

    expect(room.state.currentPhase).toBe('draw');
    expect(room.state.phaseTimer).toBe(60);
  });

  it('does not set phase if not host', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'host', 'Host', 'red');
    const guest = addPlayer(room, anyRoom, 'guest', 'Guest', 'blue');
    room.state.players.get('host')!.ready = true;
    room.state.players.get('guest')!.ready = true;

    anyRoom._handleStartGame(guest);

    expect(room.state.currentPhase).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// _tick phase timer decrement
// ---------------------------------------------------------------------------

describe('_tick phase timer', () => {
  it('decrements phaseTimer during draw phase', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 10;

    anyRoom._tick(1000); // 1 second

    expect(room.state.phaseTimer).toBeLessThan(10);
    expect(room.state.phaseTimer).toBeCloseTo(9, 1);
  });

  it('decrements phaseTimer during simulate phase', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'simulate';
    room.state.phaseTimer = 5;

    anyRoom._tick(500); // 0.5 seconds

    expect(room.state.phaseTimer).toBeCloseTo(4.5, 1);
  });

  it('decrements phaseTimer during results phase', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'results';
    room.state.phaseTimer = 4;

    anyRoom._tick(2000); // 2 seconds

    expect(room.state.phaseTimer).toBeCloseTo(2, 1);
  });

  it('does not decrement phaseTimer during idle phase', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'idle';
    room.state.phaseTimer = 0;

    anyRoom._tick(1000);

    expect(room.state.phaseTimer).toBe(0);
  });

  it('does not run entity simulation during draw phase', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 60;

    // Add an entity using proper EntitySchema
    const entityId = 'e1';
    const schema = new EntitySchema();
    schema.entityId = entityId;
    schema.x = 100;
    schema.y = 100;
    schema.hp = 1;
    schema.name = 'TestEntity';
    schema.archetype = 'walking';
    schema.teamId = 'red';
    room.state.entities.set(entityId, schema);
    room._entityStates.set(entityId, {
      archetype: 'walking',
      x: 100,
      y: 100,
      speed: 5,
      vx: 5,
      vy: 0,
    } as never);

    const xBefore = room.state.entities.get(entityId)!.x;
    anyRoom._tick(1000);
    const xAfter = room.state.entities.get(entityId)!.x;

    // Entity position should NOT change during draw phase
    expect(xAfter).toBe(xBefore);
  });
});

// ---------------------------------------------------------------------------
// _advancePhase transitions
// ---------------------------------------------------------------------------

describe('_advancePhase draw -> simulate', () => {
  it('sets currentPhase to simulate and phaseTimer to 30', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 0;

    anyRoom._advancePhase();

    expect(room.state.currentPhase).toBe('simulate');
    expect(room.state.phaseTimer).toBe(30);
  });

  it('does NOT reset hasSubmittedDrawing at draw -> simulate transition', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Player1', 'red');
    room.state.players.get('p1')!.hasSubmittedDrawing = true;
    room.state.currentPhase = 'draw';

    anyRoom._advancePhase();

    // hasSubmittedDrawing should still be true (reset only at results->draw)
    expect(room.state.players.get('p1')!.hasSubmittedDrawing).toBe(true);
  });

  it('spawns pending profiles as entities at draw -> simulate transition', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room._pendingProfiles.set('p1', {
      profile: { name: 'Dragon', archetype: 'flying', traits: ['fierce'], role: 'Hunter', speed: 8 },
      teamId: 'red',
    });

    expect(room.state.entities.size).toBe(0);
    anyRoom._advancePhase();
    expect(room.state.entities.size).toBe(1);
  });

  it('clears _pendingProfiles after draw -> simulate transition', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room._pendingProfiles.set('p1', {
      profile: { name: 'Dragon', archetype: 'flying', traits: ['fierce'], role: 'Hunter', speed: 8 },
      teamId: 'red',
    });

    anyRoom._advancePhase();

    expect(room._pendingProfiles.size).toBe(0);
  });

  it('spawns red team entities in left half', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room._pendingProfiles.set('p1', {
      profile: { name: 'RedWolf', archetype: 'walking', traits: ['fierce'], role: 'Predator', speed: 5 },
      teamId: 'red',
    });

    anyRoom._advancePhase();

    const entity = Array.from(room.state.entities.values())[0];
    expect(entity.x).toBeGreaterThanOrEqual(40);
    expect(entity.x).toBeLessThanOrEqual(1280 / 2 - 40); // 600
  });

  it('spawns blue team entities in right half', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room._pendingProfiles.set('p1', {
      profile: { name: 'BlueEagle', archetype: 'flying', traits: ['swift'], role: 'Scout', speed: 7 },
      teamId: 'blue',
    });

    anyRoom._advancePhase();

    const entity = Array.from(room.state.entities.values())[0];
    expect(entity.x).toBeGreaterThanOrEqual(1280 / 2 + 40); // 680
    expect(entity.x).toBeLessThanOrEqual(1280 - 40); // 1240
  });
});

describe('_advancePhase simulate -> results', () => {
  it('sets currentPhase to results and phaseTimer to 4', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'simulate';
    room.state.phaseTimer = 0;

    anyRoom._advancePhase();

    expect(room.state.currentPhase).toBe('results');
    expect(room.state.phaseTimer).toBe(4);
  });
});

describe('_advancePhase results -> draw', () => {
  it('sets currentPhase to draw and phaseTimer to 60', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'results';
    room.state.phaseTimer = 0;

    anyRoom._advancePhase();

    expect(room.state.currentPhase).toBe('draw');
    expect(room.state.phaseTimer).toBe(60);
  });

  it('resets hasSubmittedDrawing to false for all players', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Player1', 'red');
    addPlayer(room, anyRoom, 'p2', 'Player2', 'blue');
    room.state.players.get('p1')!.hasSubmittedDrawing = true;
    room.state.players.get('p2')!.hasSubmittedDrawing = true;
    room.state.currentPhase = 'results';

    anyRoom._advancePhase();

    expect(room.state.players.get('p1')!.hasSubmittedDrawing).toBe(false);
    expect(room.state.players.get('p2')!.hasSubmittedDrawing).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _tick triggers _advancePhase when phaseTimer reaches 0
// ---------------------------------------------------------------------------

describe('_tick triggers phase advance at timer zero', () => {
  it('advances from draw to simulate when timer expires', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 0.01; // nearly zero

    anyRoom._tick(100); // 100ms — will bring timer to 0

    expect(room.state.currentPhase).toBe('simulate');
  });
});

// ---------------------------------------------------------------------------
// submit_drawing handler
// ---------------------------------------------------------------------------

describe('submit_drawing handler', () => {
  it('rejects submission when not in draw phase', async () => {
    const { room, anyRoom } = setupRoom();
    const client = addPlayer(room, anyRoom, 'p1', 'Player1', 'red');
    room.state.currentPhase = 'idle';

    await anyRoom._handleSubmitDrawing(client, { imageDataUrl: 'data:image/png;base64,abc' });

    expect(room.state.players.get('p1')!.hasSubmittedDrawing).toBe(false);
    expect(room._pendingProfiles.size).toBe(0);
  });

  it('sets hasSubmittedDrawing to true synchronously', async () => {
    const { room, anyRoom } = setupRoom();
    const client = addPlayer(room, anyRoom, 'p1', 'Player1', 'red');
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 60;

    // Don't await — check synchronous state update
    const promise = anyRoom._handleSubmitDrawing(client, { imageDataUrl: 'data:image/png;base64,abc' });
    expect(room.state.players.get('p1')!.hasSubmittedDrawing).toBe(true);
    await promise;
  });

  it('rejects second submission (idempotent guard)', async () => {
    const { room, anyRoom } = setupRoom();
    const client = addPlayer(room, anyRoom, 'p1', 'Player1', 'red');
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 60;

    await anyRoom._handleSubmitDrawing(client, { imageDataUrl: 'data:image/png;base64,abc' });
    const firstProfileCount = room._pendingProfiles.size;

    // Second submission should be ignored
    await anyRoom._handleSubmitDrawing(client, { imageDataUrl: 'data:image/png;base64,abc' });
    expect(room._pendingProfiles.size).toBe(firstProfileCount);
  });

  it('buffers profile in _pendingProfiles after submission', async () => {
    const { room, anyRoom } = setupRoom();
    const client = addPlayer(room, anyRoom, 'p1', 'Player1', 'red');
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 60;

    await anyRoom._handleSubmitDrawing(client, { imageDataUrl: 'data:image/png;base64,abc' });

    expect(room._pendingProfiles.has('p1')).toBe(true);
    expect(room._pendingProfiles.get('p1')!.teamId).toBe('red');
  });

  it('sets phaseTimer to 0 when all players have submitted (early end)', async () => {
    const { room, anyRoom } = setupRoom();
    const p1 = addPlayer(room, anyRoom, 'p1', 'Player1', 'red');
    const p2 = addPlayer(room, anyRoom, 'p2', 'Player2', 'blue');
    room.state.currentPhase = 'draw';
    room.state.phaseTimer = 60;

    await anyRoom._handleSubmitDrawing(p1, { imageDataUrl: 'data:image/png;base64,abc' });
    // Timer should not be 0 yet (p2 hasn't submitted)
    expect(room.state.phaseTimer).toBeGreaterThan(0);

    await anyRoom._handleSubmitDrawing(p2, { imageDataUrl: 'data:image/png;base64,abc' });
    // Now all submitted — timer should be 0
    expect(room.state.phaseTimer).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// _allPlayersSubmitted helper
// ---------------------------------------------------------------------------

describe('_allPlayersSubmitted', () => {
  it('returns true when all players have submitted', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'P1', 'red');
    addPlayer(room, anyRoom, 'p2', 'P2', 'blue');
    room.state.players.get('p1')!.hasSubmittedDrawing = true;
    room.state.players.get('p2')!.hasSubmittedDrawing = true;

    expect(anyRoom._allPlayersSubmitted()).toBe(true);
  });

  it('returns false when some players have not submitted', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'P1', 'red');
    addPlayer(room, anyRoom, 'p2', 'P2', 'blue');
    room.state.players.get('p1')!.hasSubmittedDrawing = true;
    // p2 has not submitted

    expect(anyRoom._allPlayersSubmitted()).toBe(false);
  });

  it('returns false when no players have submitted', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'P1', 'red');

    expect(anyRoom._allPlayersSubmitted()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Entity accumulation across rounds
// ---------------------------------------------------------------------------

describe('entities accumulate across rounds', () => {
  it('existing entities are not removed at draw -> simulate transition', () => {
    const { room, anyRoom } = setupRoom();

    // Add a pre-existing entity using proper EntitySchema
    const existingSchema = new EntitySchema();
    existingSchema.entityId = 'existing-e';
    existingSchema.x = 500;
    existingSchema.y = 300;
    existingSchema.hp = 1;
    existingSchema.name = 'OldEntity';
    existingSchema.archetype = 'walking';
    existingSchema.teamId = 'blue';
    room.state.entities.set('existing-e', existingSchema);
    room._entityStates.set('existing-e', {
      archetype: 'walking', x: 500, y: 300, speed: 5, vx: 0, vy: 0,
    } as never);

    room.state.currentPhase = 'draw';
    room._pendingProfiles.set('p1', {
      profile: { name: 'NewWolf', archetype: 'walking', traits: ['fierce'], role: 'Predator', speed: 5 },
      teamId: 'red',
    });

    anyRoom._advancePhase();

    // Should have 2 entities: 1 existing + 1 newly spawned
    expect(room.state.entities.size).toBe(2);
    expect(room.state.entities.has('existing-e')).toBe(true);
  });
});
