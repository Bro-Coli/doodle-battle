import { Room, Client } from '@colyseus/core';
import { Schema, type, MapSchema } from '@colyseus/schema';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export class PlayerSchema extends Schema {
  @type('string') name: string = '';
  @type('string') team: string = 'red';
  @type('boolean') ready: boolean = false;
}

export class GameState extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type('string') hostSessionId: string = '';
  @type('number') maxPlayers: number = 8;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class GameRoom extends Room<{ state: GameState }> {
  state = new GameState();

  onCreate(options: Record<string, unknown> = {}): void {
    const maxPlayers = (options.maxPlayers as number) ?? 8;
    this.maxClients = maxPlayers;
    this.state.maxPlayers = maxPlayers;

    // Override roomId with a 4-char human-readable code
    this.roomId = this._generate4CharCode();

    if (options.isPrivate) {
      this.setPrivate(true);
    }

    this.onMessage('toggle_ready', (client: Client) => {
      this._handleToggleReady(client, {});
    });

    this.onMessage('start_game', (client: Client) => {
      this._handleStartGame(client);
    });
  }

  onJoin(client: Client, options: Record<string, unknown> = {}): void {
    const player = new PlayerSchema();
    player.name = ((options.name as string) ?? 'Player').slice(0, 20);
    player.team = this._assignTeam();
    player.ready = false;

    this.state.players.set(client.sessionId, player);

    // First player becomes host
    if (this.state.hostSessionId === '') {
      this.state.hostSessionId = client.sessionId;
    }
  }

  onLeave(client: Client, _code?: number): void {
    this.state.players.delete(client.sessionId);

    // Re-assign host if the host left
    if (this.state.hostSessionId === client.sessionId) {
      const remaining = (this.clients as { sessionId: string }[]).filter(
        (c) => c.sessionId !== client.sessionId,
      );
      if (remaining.length > 0) {
        this.state.hostSessionId = remaining[0].sessionId;
      } else {
        this.state.hostSessionId = '';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Exposed handlers (accessible by tests via cast-to-any)
  // ---------------------------------------------------------------------------

  _handleToggleReady(client: { sessionId: string }, _msg: unknown): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.ready = !player.ready;
    }
  }

  _handleStartGame(client: { sessionId: string }): void {
    if (client.sessionId !== this.state.hostSessionId) return;
    if ((this.clients as unknown[]).length < 2) return;

    // All players must be ready
    let allReady = true;
    this.state.players.forEach((player) => {
      if (!player.ready) allReady = false;
    });
    if (!allReady) return;

    this.broadcast('game_starting', { startedBy: client.sessionId });
    this.lock();
  }

  // ---------------------------------------------------------------------------
  // Pure helpers
  // ---------------------------------------------------------------------------

  _generate4CharCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    return code;
  }

  _assignTeam(): string {
    let red = 0;
    let blue = 0;
    this.state.players.forEach((player) => {
      if (player.team === 'red') red++;
      else if (player.team === 'blue') blue++;
    });
    return blue < red ? 'blue' : 'red';
  }
}
