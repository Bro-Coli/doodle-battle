import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapSchema } from '@colyseus/schema';
import { PlayerSchema, GameState, GameRoom } from '../src/rooms/GameRoom.js';

// ---------------------------------------------------------------------------
// Schema field defaults
// ---------------------------------------------------------------------------

describe('PlayerSchema defaults', () => {
  it('has correct field defaults', () => {
    const p = new PlayerSchema();
    expect(p.name).toBe('');
    expect(p.team).toBe('red');
    expect(p.ready).toBe(false);
  });
});

describe('GameState defaults', () => {
  it('has players MapSchema, empty hostSessionId, maxPlayers 8', () => {
    const gs = new GameState();
    expect(gs.players).toBeInstanceOf(MapSchema);
    expect(gs.hostSessionId).toBe('');
    expect(gs.maxPlayers).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Pure helper: _generate4CharCode
// ---------------------------------------------------------------------------

describe('GameRoom._generate4CharCode', () => {
  it('returns a 4-character string', () => {
    const room = new GameRoom();
    const code = (room as unknown as { _generate4CharCode(): string })._generate4CharCode();
    expect(code).toHaveLength(4);
  });

  it('only uses allowed characters', () => {
    const room = new GameRoom();
    const ALLOWED = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    for (let i = 0; i < 50; i++) {
      const code = (room as unknown as { _generate4CharCode(): string })._generate4CharCode();
      for (const ch of code) {
        expect(ALLOWED.has(ch)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Pure helper: _assignTeam
// ---------------------------------------------------------------------------

describe('GameRoom._assignTeam', () => {
  let room: GameRoom;

  beforeEach(() => {
    room = new GameRoom();
    room.state = new GameState();
  });

  it('returns "red" when teams are equal (empty state)', () => {
    const team = (room as unknown as { _assignTeam(): string })._assignTeam();
    expect(team).toBe('red');
  });

  it('returns "blue" when red has more players', () => {
    const p = new PlayerSchema();
    p.team = 'red';
    room.state.players.set('s1', p);
    const team = (room as unknown as { _assignTeam(): string })._assignTeam();
    expect(team).toBe('blue');
  });

  it('returns "red" when blue has more players', () => {
    const p = new PlayerSchema();
    p.team = 'blue';
    room.state.players.set('s1', p);
    const team = (room as unknown as { _assignTeam(): string })._assignTeam();
    expect(team).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// Room lifecycle helpers
// ---------------------------------------------------------------------------

type AnyRoom = {
  clients: { sessionId: string }[];
  broadcast: ReturnType<typeof vi.fn>;
  lock: ReturnType<typeof vi.fn>;
  _handleToggleReady(client: { sessionId: string }, msg: unknown): void;
  _handleStartGame(client: { sessionId: string }): void;
  _generate4CharCode(): string;
  _assignTeam(): string;
};

function makeMockClient(sessionId: string) {
  return { sessionId };
}

// ---------------------------------------------------------------------------
// onJoin
// ---------------------------------------------------------------------------

describe('GameRoom.onJoin', () => {
  let room: GameRoom;
  let anyRoom: AnyRoom;

  beforeEach(() => {
    room = new GameRoom();
    room.state = new GameState();
    anyRoom = room as unknown as AnyRoom;
    anyRoom.clients = [];
  });

  it('adds a PlayerSchema to state.players keyed by sessionId', () => {
    const client = makeMockClient('abc');
    anyRoom.clients.push(client);
    room.onJoin(client as never, { name: 'Alice' });
    expect(room.state.players.has('abc')).toBe(true);
    expect(room.state.players.get('abc')!.name).toBe('Alice');
  });

  it('truncates names longer than 20 characters', () => {
    const client = makeMockClient('s1');
    anyRoom.clients.push(client);
    room.onJoin(client as never, { name: 'A'.repeat(30) });
    expect(room.state.players.get('s1')!.name).toHaveLength(20);
  });

  it('sets a default name "Player" when name is missing', () => {
    const client = makeMockClient('s1');
    anyRoom.clients.push(client);
    room.onJoin(client as never, {});
    expect(room.state.players.get('s1')!.name).toBe('Player');
  });

  it('marks the first joiner as host', () => {
    const client = makeMockClient('host-id');
    anyRoom.clients.push(client);
    room.onJoin(client as never, { name: 'Host' });
    expect(room.state.hostSessionId).toBe('host-id');
  });

  it('does not override host when second player joins', () => {
    const c1 = makeMockClient('host-id');
    const c2 = makeMockClient('other-id');
    anyRoom.clients.push(c1);
    room.onJoin(c1 as never, { name: 'Host' });
    anyRoom.clients.push(c2);
    room.onJoin(c2 as never, { name: 'Guest' });
    expect(room.state.hostSessionId).toBe('host-id');
  });
});

// ---------------------------------------------------------------------------
// onLeave
// ---------------------------------------------------------------------------

describe('GameRoom.onLeave', () => {
  let room: GameRoom;
  let anyRoom: AnyRoom;

  beforeEach(() => {
    room = new GameRoom();
    room.state = new GameState();
    anyRoom = room as unknown as AnyRoom;
    anyRoom.clients = [];
  });

  it('removes the player from state.players', () => {
    const client = makeMockClient('s1');
    anyRoom.clients.push(client);
    room.onJoin(client as never, { name: 'Alice' });
    anyRoom.clients.splice(0, 1);
    room.onLeave(client as never, false);
    expect(room.state.players.has('s1')).toBe(false);
  });

  it('reassigns host when the current host leaves and another player exists', () => {
    const host = makeMockClient('host');
    const guest = makeMockClient('guest');
    anyRoom.clients.push(host);
    room.onJoin(host as never, { name: 'Host' });
    anyRoom.clients.push(guest);
    room.onJoin(guest as never, { name: 'Guest' });
    // host leaves — remove from clients mock
    anyRoom.clients.splice(0, 1);
    room.onLeave(host as never, false);
    expect(room.state.hostSessionId).toBe('guest');
  });

  it('clears hostSessionId when the last player leaves', () => {
    const client = makeMockClient('s1');
    anyRoom.clients.push(client);
    room.onJoin(client as never, { name: 'Alone' });
    anyRoom.clients.splice(0, 1);
    room.onLeave(client as never, false);
    expect(room.state.hostSessionId).toBe('');
  });
});

// ---------------------------------------------------------------------------
// toggle_ready handler
// ---------------------------------------------------------------------------

describe('toggle_ready handler', () => {
  it('flips player.ready boolean', () => {
    const room = new GameRoom();
    room.state = new GameState();
    const anyRoom = room as unknown as AnyRoom;
    anyRoom.clients = [];
    const client = makeMockClient('s1');
    anyRoom.clients.push(client);
    room.onJoin(client as never, { name: 'Alice' });

    expect(room.state.players.get('s1')!.ready).toBe(false);
    anyRoom._handleToggleReady(client, {});
    expect(room.state.players.get('s1')!.ready).toBe(true);
    anyRoom._handleToggleReady(client, {});
    expect(room.state.players.get('s1')!.ready).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// start_game handler
// ---------------------------------------------------------------------------

describe('start_game handler', () => {
  let room: GameRoom;
  let anyRoom: AnyRoom;

  beforeEach(() => {
    room = new GameRoom();
    room.state = new GameState();
    anyRoom = room as unknown as AnyRoom;
    anyRoom.clients = [];
    anyRoom.broadcast = vi.fn();
    anyRoom.lock = vi.fn();
  });

  it('rejects when sender is not host', () => {
    const host = makeMockClient('host');
    const guest = makeMockClient('guest');
    anyRoom.clients.push(host, guest);
    room.onJoin(host as never, { name: 'Host' });
    room.onJoin(guest as never, { name: 'Guest' });

    anyRoom._handleStartGame(guest);
    expect(anyRoom.broadcast).not.toHaveBeenCalled();
    expect(anyRoom.lock).not.toHaveBeenCalled();
  });

  it('rejects when fewer than 2 clients connected', () => {
    const host = makeMockClient('host');
    anyRoom.clients.push(host);
    room.onJoin(host as never, { name: 'Host' });

    anyRoom._handleStartGame(host);
    expect(anyRoom.broadcast).not.toHaveBeenCalled();
  });

  it('broadcasts game_starting and locks room when valid', () => {
    const host = makeMockClient('host');
    const guest = makeMockClient('guest');
    anyRoom.clients.push(host, guest);
    room.onJoin(host as never, { name: 'Host' });
    room.onJoin(guest as never, { name: 'Guest' });

    anyRoom._handleStartGame(host);
    expect(anyRoom.broadcast).toHaveBeenCalledWith('game_starting', expect.anything());
    expect(anyRoom.lock).toHaveBeenCalled();
  });
});
