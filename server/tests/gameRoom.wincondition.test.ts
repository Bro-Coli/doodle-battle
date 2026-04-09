/**
 * Win condition tests for GameRoom.
 *
 * Covers: _computeWinner, _finishGame, _buildPlayerStats, kill tracking,
 * forfeit detection, auto-start, return-to-lobby, and maxRounds configuration.
 *
 * Pattern: direct instantiation, cast to AnyRoom for private methods.
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
  unlock: ReturnType<typeof vi.fn>;
  _handleStartGame(client: { sessionId: string }): void;
  _handleToggleReady(client: { sessionId: string }, msg: unknown): void;
  _handleSubmitDrawing(client: { sessionId: string }, msg: unknown): Promise<void>;
  _advancePhase(): void;
  _allPlayersSubmitted(): boolean;
  _allPlayersReady(): boolean;
  _tick(deltaMS: number): void;
  _computeWinner(): 'red' | 'blue' | 'draw' | null;
  _finishGame(winner: 'red' | 'blue' | 'draw'): void;
  _buildPlayerStats(): Record<string, { name: string; team: string; entitiesDrawn: number; entitiesSurviving: number; kills: number }>;
  _handleReturnToLobby(client: { sessionId: string }): void;
  _killCounts: Map<string, number>;
  _entitiesDrawn: Map<string, number>;
  _handleFightContact(attackerId: string, targetId: string, toRemove: string[]): void;
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
  anyRoom.unlock = vi.fn();
  return { room, anyRoom };
}

function addPlayer(room: GameRoom, anyRoom: AnyRoom, sessionId: string, name: string, team = 'red') {
  const client = makeMockClient(sessionId);
  anyRoom.clients.push(client);
  room.onJoin(client as never, { name });
  room.state.players.get(sessionId)!.team = team;
  return client;
}

function addEntity(room: GameRoom, entityId: string, teamId: string, ownerSessionId: string) {
  const schema = new EntitySchema();
  schema.entityId = entityId;
  schema.x = 400;
  schema.y = 300;
  schema.hp = 1;
  schema.name = 'TestEntity';
  schema.archetype = 'walking';
  schema.teamId = teamId;
  schema.ownerSessionId = ownerSessionId;
  room.state.entities.set(entityId, schema);
  room._entityStates.set(entityId, {
    archetype: 'walking',
    x: 400,
    y: 300,
    speed: 5,
    vx: 0,
    vy: 0,
  } as never);
  return schema;
}

// ---------------------------------------------------------------------------
// GameState schema extensions
// ---------------------------------------------------------------------------

describe('GameState schema extensions', () => {
  it('has currentRound defaulting to 0', () => {
    const gs = new GameState();
    expect(gs.currentRound).toBe(0);
  });

  it('has maxRounds defaulting to 5', () => {
    const gs = new GameState();
    expect(gs.maxRounds).toBe(5);
  });

  it('has gameStatus defaulting to active', () => {
    const gs = new GameState();
    expect(gs.gameStatus).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// maxRounds option
// ---------------------------------------------------------------------------

describe('onCreate maxRounds option', () => {
  it('defaults maxRounds to 5 if not provided', () => {
    const { room } = setupRoom();
    room.onCreate({});
    expect(room.state.maxRounds).toBe(5);
  });

  it('uses provided maxRounds value', () => {
    const { room } = setupRoom();
    room.onCreate({ maxRounds: 10 });
    expect(room.state.maxRounds).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// _computeWinner
// ---------------------------------------------------------------------------

describe('_computeWinner', () => {
  it('returns blue when red has 0 entities and blue has entities', () => {
    const { room, anyRoom } = setupRoom();
    addEntity(room, 'b1', 'blue', 'p2');
    // No red entities
    expect(anyRoom._computeWinner()).toBe('blue');
  });

  it('returns red when blue has 0 entities and red has entities', () => {
    const { room, anyRoom } = setupRoom();
    addEntity(room, 'r1', 'red', 'p1');
    // No blue entities
    expect(anyRoom._computeWinner()).toBe('red');
  });

  it('returns draw when both teams have 0 entities', () => {
    const { room, anyRoom } = setupRoom();
    // No entities at all
    expect(anyRoom._computeWinner()).toBe('draw');
  });

  it('returns null when both teams have entities and round limit not reached', () => {
    const { room, anyRoom } = setupRoom();
    addEntity(room, 'r1', 'red', 'p1');
    addEntity(room, 'b1', 'blue', 'p2');
    room.state.currentRound = 2;
    room.state.maxRounds = 5;
    expect(anyRoom._computeWinner()).toBeNull();
  });

  it('returns team with more entities when currentRound >= maxRounds', () => {
    const { room, anyRoom } = setupRoom();
    addEntity(room, 'r1', 'red', 'p1');
    addEntity(room, 'r2', 'red', 'p1');
    addEntity(room, 'b1', 'blue', 'p2');
    room.state.currentRound = 5;
    room.state.maxRounds = 5;
    expect(anyRoom._computeWinner()).toBe('red');
  });

  it('returns draw when equal entity counts at round limit', () => {
    const { room, anyRoom } = setupRoom();
    addEntity(room, 'r1', 'red', 'p1');
    addEntity(room, 'b1', 'blue', 'p2');
    room.state.currentRound = 5;
    room.state.maxRounds = 5;
    expect(anyRoom._computeWinner()).toBe('draw');
  });
});

// ---------------------------------------------------------------------------
// _finishGame
// ---------------------------------------------------------------------------

describe('_finishGame', () => {
  it('sets currentPhase to finished', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'results';
    anyRoom._finishGame('red');
    expect(room.state.currentPhase).toBe('finished');
  });

  it('sets gameStatus to finished', () => {
    const { room, anyRoom } = setupRoom();
    anyRoom._finishGame('blue');
    expect(room.state.gameStatus).toBe('finished');
  });

  it('sets phaseTimer to 0', () => {
    const { room, anyRoom } = setupRoom();
    room.state.phaseTimer = 30;
    anyRoom._finishGame('draw');
    expect(room.state.phaseTimer).toBe(0);
  });

  it('broadcasts game_finished with winner and stats', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    anyRoom._finishGame('red');
    expect(anyRoom.broadcast).toHaveBeenCalledWith('game_finished', expect.objectContaining({
      winner: 'red',
      stats: expect.any(Object),
    }));
  });
});

// ---------------------------------------------------------------------------
// _advancePhase: results -> draw with win condition check
// ---------------------------------------------------------------------------

describe('_advancePhase results->draw win condition', () => {
  it('increments currentRound when advancing from results', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'results';
    room.state.currentRound = 1;
    // Add entities on both teams so no win condition
    addEntity(room, 'r1', 'red', 'p1');
    addEntity(room, 'b1', 'blue', 'p2');

    anyRoom._advancePhase();

    expect(room.state.currentRound).toBe(2);
  });

  it('transitions to finished when _computeWinner returns non-null', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'results';
    // Only blue entities — red wins... wait, blue team has entities so blue should win
    addEntity(room, 'b1', 'blue', 'p2');
    // No red entities

    anyRoom._advancePhase();

    expect(room.state.currentPhase).toBe('finished');
  });

  it('transitions to draw when _computeWinner returns null (both teams alive)', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'results';
    room.state.currentRound = 1;
    room.state.maxRounds = 5;
    addEntity(room, 'r1', 'red', 'p1');
    addEntity(room, 'b1', 'blue', 'p2');

    anyRoom._advancePhase();

    expect(room.state.currentPhase).toBe('draw');
  });

  it('does not set phase to draw when winner found', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'results';
    addEntity(room, 'r1', 'red', 'p1');
    // No blue entities — red wins

    anyRoom._advancePhase();

    expect(room.state.currentPhase).not.toBe('draw');
    expect(room.state.currentPhase).toBe('finished');
  });
});

// ---------------------------------------------------------------------------
// Kill tracking
// ---------------------------------------------------------------------------

describe('kill tracking', () => {
  it('increments kill count for attacker ownerSessionId on entity death', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');

    // attacker owned by p1, target owned by p2
    addEntity(room, 'attacker', 'red', 'p1');
    const target = addEntity(room, 'target', 'blue', 'p2');
    target.hp = 1; // ensure it dies on hit

    const toRemove: string[] = [];
    anyRoom._handleFightContact('attacker', 'target', toRemove);

    expect(anyRoom._killCounts.get('p1')).toBe(1);
  });

  it('does not increment kill count when target survives', () => {
    const { room, anyRoom } = setupRoom();
    addEntity(room, 'attacker', 'red', 'p1');
    const target = addEntity(room, 'target', 'blue', 'p2');
    target.hp = 3; // high HP — won't die

    const toRemove: string[] = [];
    anyRoom._handleFightContact('attacker', 'target', toRemove);

    expect(anyRoom._killCounts.get('p1') ?? 0).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// _buildPlayerStats
// ---------------------------------------------------------------------------

describe('_buildPlayerStats', () => {
  it('includes entitiesDrawn, entitiesSurviving, kills per player', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');

    // Simulate p1 drew 1 entity, 1 survives, 2 kills
    anyRoom._entitiesDrawn.set('p1', 1);
    anyRoom._killCounts.set('p1', 2);
    addEntity(room, 'r1', 'red', 'p1');

    // p2 drew 2 entities, 1 survives, 0 kills
    anyRoom._entitiesDrawn.set('p2', 2);
    addEntity(room, 'b1', 'blue', 'p2');

    const stats = anyRoom._buildPlayerStats();

    expect(stats['p1']).toEqual(expect.objectContaining({
      name: 'Alice',
      team: 'red',
      entitiesDrawn: 1,
      entitiesSurviving: 1,
      kills: 2,
    }));

    expect(stats['p2']).toEqual(expect.objectContaining({
      name: 'Bob',
      team: 'blue',
      entitiesDrawn: 2,
      entitiesSurviving: 1,
      kills: 0,
    }));
  });
});

// ---------------------------------------------------------------------------
// Forfeit detection
// ---------------------------------------------------------------------------

describe('forfeit detection in onLeave', () => {
  it('triggers game_finished when leaving team has no remaining players (active game)', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');
    room.state.currentPhase = 'simulate';

    // p1 leaves — red team forfeits, blue wins
    anyRoom.clients = anyRoom.clients.filter(c => c.sessionId !== 'p1');
    room.onLeave({ sessionId: 'p1' } as never, 1001);

    expect(anyRoom.broadcast).toHaveBeenCalledWith('game_finished', expect.objectContaining({
      winner: 'blue',
    }));
  });

  it('does not trigger forfeit during idle phase', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');
    room.state.currentPhase = 'idle';

    anyRoom.clients = anyRoom.clients.filter(c => c.sessionId !== 'p1');
    room.onLeave({ sessionId: 'p1' } as never, 1001);

    expect(anyRoom.broadcast).not.toHaveBeenCalledWith('game_finished', expect.anything());
  });

  it('does not trigger forfeit during finished phase', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');
    room.state.currentPhase = 'finished';

    anyRoom.clients = anyRoom.clients.filter(c => c.sessionId !== 'p1');
    room.onLeave({ sessionId: 'p1' } as never, 1001);

    expect(anyRoom.broadcast).not.toHaveBeenCalledWith('game_finished', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// Auto-start in _handleToggleReady
// ---------------------------------------------------------------------------

describe('auto-start when all players ready', () => {
  it('auto-starts game when all players ready and >= 2 players', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');

    // Mark p1 ready first
    anyRoom._handleToggleReady({ sessionId: 'p1' }, {});
    // Game should not start yet
    expect(room.state.currentPhase).toBe('idle');

    // Mark p2 ready — all ready now
    anyRoom._handleToggleReady({ sessionId: 'p2' }, {});
    // Auto-start should fire
    expect(room.state.currentPhase).toBe('draw');
  });

  it('does NOT auto-start when only 1 player is connected', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');

    anyRoom._handleToggleReady({ sessionId: 'p1' }, {});

    // Only 1 player — should not start
    expect(room.state.currentPhase).toBe('idle');
  });

  it('does NOT auto-start when not all players are ready', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');

    // Only p1 toggles ready
    anyRoom._handleToggleReady({ sessionId: 'p1' }, {});

    expect(room.state.currentPhase).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// _handleReturnToLobby
// ---------------------------------------------------------------------------

describe('_handleReturnToLobby', () => {
  it('resets currentPhase to idle', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'finished';
    room.state.gameStatus = 'finished';

    anyRoom._handleReturnToLobby({ sessionId: room.state.hostSessionId });

    expect(room.state.currentPhase).toBe('idle');
  });

  it('resets gameStatus to active', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'finished';
    room.state.gameStatus = 'finished';

    anyRoom._handleReturnToLobby({ sessionId: room.state.hostSessionId });

    expect(room.state.gameStatus).toBe('active');
  });

  it('resets currentRound to 0', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'finished';
    room.state.currentRound = 5;

    anyRoom._handleReturnToLobby({ sessionId: room.state.hostSessionId });

    expect(room.state.currentRound).toBe(0);
  });

  it('resets all player ready and hasSubmittedDrawing flags', () => {
    const { room, anyRoom } = setupRoom();
    addPlayer(room, anyRoom, 'p1', 'Alice', 'red');
    addPlayer(room, anyRoom, 'p2', 'Bob', 'blue');
    room.state.players.get('p1')!.ready = true;
    room.state.players.get('p1')!.hasSubmittedDrawing = true;
    room.state.players.get('p2')!.ready = true;
    room.state.currentPhase = 'finished';

    anyRoom._handleReturnToLobby({ sessionId: room.state.hostSessionId });

    expect(room.state.players.get('p1')!.ready).toBe(false);
    expect(room.state.players.get('p1')!.hasSubmittedDrawing).toBe(false);
    expect(room.state.players.get('p2')!.ready).toBe(false);
  });

  it('clears all entities', () => {
    const { room, anyRoom } = setupRoom();
    addEntity(room, 'r1', 'red', 'p1');
    addEntity(room, 'b1', 'blue', 'p2');
    room.state.currentPhase = 'finished';

    anyRoom._handleReturnToLobby({ sessionId: room.state.hostSessionId });

    expect(room.state.entities.size).toBe(0);
  });

  it('clears _killCounts and _entitiesDrawn', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'finished';
    anyRoom._killCounts.set('p1', 3);
    anyRoom._entitiesDrawn.set('p1', 2);

    anyRoom._handleReturnToLobby({ sessionId: room.state.hostSessionId });

    expect(anyRoom._killCounts.size).toBe(0);
    expect(anyRoom._entitiesDrawn.size).toBe(0);
  });

  it('is a no-op when currentPhase is not finished', () => {
    const { room, anyRoom } = setupRoom();
    room.state.currentPhase = 'simulate';
    room.state.currentRound = 3;

    anyRoom._handleReturnToLobby({ sessionId: room.state.hostSessionId });

    // Should not reset anything
    expect(room.state.currentRound).toBe(3);
    expect(room.state.currentPhase).toBe('simulate');
  });
});
