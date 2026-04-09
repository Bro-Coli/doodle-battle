import { Room, Client } from '@colyseus/core';
import { Schema, type, MapSchema } from '@colyseus/schema';
import {
  dispatchBehavior,
  initEntityState,
  WORLD_BOUNDS,
} from '@crayon-world/shared/src/simulation/EntitySimulation.js';
import { recognizeDrawingInternal } from '../recognition/recognizeDrawingInternal.js';
import type {
  EntityState,
  SpreadingState,
} from '@crayon-world/shared/src/simulation/EntitySimulation.js';
import {
  resolveInteraction,
  applyInteractionSteering,
  DETECTION_RANGE_FRACTION,
  FIGHT_PROXIMITY_FRACTION,
  FIGHT_COOLDOWN_MS,
} from '@crayon-world/shared/src/simulation/interactionBehaviors.js';
import type { EntityProfile, InteractionMatrix, Archetype } from '@crayon-world/shared/src/types.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export class EntitySchema extends Schema {
  @type('string') entityId: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') hp: number = 1;
  @type('string') name: string = '';
  @type('string') archetype: string = '';
  @type('string') teamId: string = '';
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
}

export class PlayerSchema extends Schema {
  @type('string') name: string = '';
  @type('string') team: string = 'red';
  @type('boolean') ready: boolean = false;
  @type('boolean') hasSubmittedDrawing: boolean = false;
}

export class GameState extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: EntitySchema }) entities = new MapSchema<EntitySchema>();
  @type('string') hostSessionId: string = '';
  @type('number') maxPlayers: number = 8;
  @type('string') currentPhase: string = 'idle';
  @type('number') phaseTimer: number = 0;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class GameRoom extends Room<{ state: GameState }> {
  state = new GameState();

  // Server-only simulation state — NOT in Schema
  _entityStates: Map<string, EntityState> = new Map();
  _entityProfiles: Map<string, EntityProfile> = new Map();
  _interactionMatrix: InteractionMatrix | null = null;
  _fightCooldowns: Map<string, number> = new Map();
  _nameIdMap: Map<string, string> = new Map();
  _dyingEntities: Set<string> = new Set();
  // Pending profiles buffered during draw phase — spawned simultaneously at simulate start
  _pendingProfiles: Map<string, { profile: EntityProfile; teamId: string }> = new Map();

  onCreate(options: Record<string, unknown> = {}): void {
    const maxPlayers = (options.maxPlayers as number) ?? 8;
    this.maxClients = maxPlayers;
    this.state.maxPlayers = maxPlayers;

    // Override roomId with a 4-char human-readable code
    this.roomId = this._generate4CharCode();

    if (options.isPrivate) {
      this.setPrivate(true);
    }

    // Initialize server-side simulation state
    this._entityStates = new Map();
    this._entityProfiles = new Map();
    this._interactionMatrix = null;
    this._fightCooldowns = new Map();
    this._nameIdMap = new Map();
    this._dyingEntities = new Set();
    this._pendingProfiles = new Map();

    // 20Hz simulation tick
    this.setSimulationInterval((deltaTime) => this._tick(deltaTime), 50);

    this.onMessage('toggle_ready', (client: Client) => {
      this._handleToggleReady(client, {});
    });

    this.onMessage('start_game', (client: Client) => {
      this._handleStartGame(client);
    });

    this.onMessage('spawn_entity', (client: Client, msg: unknown) => {
      this._handleSpawnEntity(client, msg);
    });

    this.onMessage('interaction_matrix', (client: Client, msg: unknown) => {
      this._handleInteractionMatrix(client, msg);
    });

    this.onMessage('remove_all_entities', () => {
      this._handleRemoveAllEntities();
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
  // Simulation tick — runs at 20Hz
  // ---------------------------------------------------------------------------

  _tick(deltaMS: number): void {
    const dt = deltaMS / 1000;
    const world = WORLD_BOUNDS;
    const worldDiag = Math.sqrt(world.width * world.width + world.height * world.height);
    const detectionRange = worldDiag * DETECTION_RANGE_FRACTION;
    const fightProximity = worldDiag * FIGHT_PROXIMITY_FRACTION;

    // Decrement fight cooldowns
    for (const [key, remaining] of this._fightCooldowns) {
      const updated = remaining - deltaMS;
      if (updated <= 0) {
        this._fightCooldowns.delete(key);
      } else {
        this._fightCooldowns.set(key, updated);
      }
    }

    const toRemove: string[] = [];

    // Clean up dying entities immediately
    for (const entityId of this._dyingEntities) {
      toRemove.push(entityId);
    }

    for (const [entityId, state] of this._entityStates) {
      // Skip dying entities — handled in toRemove above
      if (this._dyingEntities.has(entityId)) continue;

      let newState: EntityState;
      const isMovable = state.archetype !== 'rooted' && state.archetype !== 'stationary';

      // Resolve interaction steering if matrix exists and entity is movable
      if (isMovable && this._interactionMatrix) {
        const resolved = resolveInteraction(
          entityId,
          this._entityStates,
          this._entityProfiles,
          this._dyingEntities,
          this._interactionMatrix,
          this._nameIdMap,
          detectionRange,
        );

        if (resolved) {
          const targetState = this._entityStates.get(resolved.targetContainer);
          if (targetState) {
            newState = applyInteractionSteering(state, resolved, targetState, dt, worldDiag);

            // Fight contact check
            if ((resolved.type === 'fight' || resolved.type === 'chase') && resolved.distance < fightProximity) {
              this._handleFightContact(entityId, resolved.targetContainer, toRemove);
            }
          } else {
            newState = dispatchBehavior(state, dt, world);
          }
        } else {
          newState = dispatchBehavior(state, dt, world);
        }
      } else {
        newState = dispatchBehavior(state, dt, world);
      }

      // Bounce off world borders (use 40px half-size as default entity radius)
      const halfSize = 40;
      if (newState.x < halfSize) newState = { ...newState, x: halfSize };
      if (newState.x > world.width - halfSize) newState = { ...newState, x: world.width - halfSize };
      if (newState.y < halfSize) newState = { ...newState, y: halfSize };
      if (newState.y > world.height - halfSize) newState = { ...newState, y: world.height - halfSize };

      // Handle spreading pendingSpawn
      if (newState.archetype === 'spreading') {
        const spreadState = newState as SpreadingState;
        if (spreadState.pendingSpawn) {
          // Clear the flag
          newState = { ...spreadState, pendingSpawn: false };

          // Create a new entity copy
          const newEntityId = crypto.randomUUID();
          const offsetX = (Math.random() - 0.5) * 2 * spreadState.spawnRadius;
          const offsetY = (Math.random() - 0.5) * 2 * spreadState.spawnRadius;
          const spawnX = Math.max(halfSize, Math.min(world.width - halfSize, spreadState.x + offsetX));
          const spawnY = Math.max(halfSize, Math.min(world.height - halfSize, spreadState.y + offsetY));

          // Get original profile for copying
          const originalProfile = this._entityProfiles.get(entityId);

          const newEntityState = initEntityState('spreading', originalProfile?.speed ?? 3, spawnX, spawnY);
          const newCopyState = { ...newEntityState as SpreadingState, isACopy: true };

          const newSchema = new EntitySchema();
          const originalSchema = this.state.entities.get(entityId);
          newSchema.entityId = newEntityId;
          newSchema.x = spawnX;
          newSchema.y = spawnY;
          newSchema.hp = 1;
          newSchema.name = originalSchema?.name ?? '';
          newSchema.archetype = 'spreading';
          newSchema.teamId = originalSchema?.teamId ?? '';

          this.state.entities.set(newEntityId, newSchema);
          this._entityStates.set(newEntityId, newCopyState);

          if (originalProfile) {
            this._entityProfiles.set(newEntityId, { ...originalProfile });
          }
        }
      }

      // Update server-side state
      this._entityStates.set(entityId, newState);

      // Sync render-critical fields to Schema
      const schema = this.state.entities.get(entityId);
      if (schema) {
        schema.x = newState.x;
        schema.y = newState.y;
        schema.vx = 'vx' in newState ? (newState as { vx: number }).vx : 0;
        schema.vy = 'vy' in newState ? (newState as { vy: number }).vy : 0;
      }
    }

    // Apply removals AFTER iteration — no mutation during loop
    for (const entityId of toRemove) {
      this._entityStates.delete(entityId);
      this._entityProfiles.delete(entityId);
      this.state.entities.delete(entityId);
      this._dyingEntities.delete(entityId);
    }
  }

  // ---------------------------------------------------------------------------
  // Fight contact handler
  // ---------------------------------------------------------------------------

  _handleFightContact(attackerId: string, targetId: string, toRemove: string[]): void {
    const cooldownKey = `${attackerId}:${targetId}`;

    // Skip if on cooldown
    if (this._fightCooldowns.has(cooldownKey)) return;

    const targetSchema = this.state.entities.get(targetId);
    if (!targetSchema) return;

    // Decrement HP
    targetSchema.hp = targetSchema.hp - 1;

    // Set cooldown
    this._fightCooldowns.set(cooldownKey, FIGHT_COOLDOWN_MS);

    // If HP reaches 0, mark for removal
    if (targetSchema.hp <= 0) {
      this._dyingEntities.add(targetId);
      toRemove.push(targetId);
    }
  }

  // ---------------------------------------------------------------------------
  // Message handlers
  // ---------------------------------------------------------------------------

  _handleSpawnEntity(_client: { sessionId: string }, msg: unknown): void {
    const data = msg as Record<string, unknown>;

    // Validate required fields
    if (
      !data ||
      typeof data.entityId !== 'string' ||
      typeof data.name !== 'string' ||
      typeof data.archetype !== 'string' ||
      typeof data.speed !== 'number' ||
      typeof data.x !== 'number' ||
      typeof data.y !== 'number' ||
      typeof data.teamId !== 'string'
    ) {
      return;
    }

    const { entityId, name, archetype, speed, x, y, teamId } = data as {
      entityId: string;
      name: string;
      archetype: Archetype;
      speed: number;
      x: number;
      y: number;
      teamId: string;
    };

    // Create EntitySchema for network sync
    const schema = new EntitySchema();
    schema.entityId = entityId;
    schema.name = name;
    schema.archetype = archetype;
    schema.teamId = teamId;
    schema.x = x;
    schema.y = y;
    schema.hp = 1;

    // Create EntityState for server-side simulation
    const entityState = initEntityState(archetype, speed, x, y);

    // Create EntityProfile for interaction resolution
    const profile: EntityProfile = {
      name,
      archetype,
      traits: [],
      role: '',
      speed,
    };

    this.state.entities.set(entityId, schema);
    this._entityStates.set(entityId, entityState);
    this._entityProfiles.set(entityId, profile);
  }

  _handleInteractionMatrix(_client: { sessionId: string }, msg: unknown): void {
    this._interactionMatrix = msg as InteractionMatrix;

    // Build nameIdMap from matrix entries so resolveInteraction can look up by name
    if (this._interactionMatrix?.entries) {
      this._buildNameIdMap();
    }
  }

  _handleRemoveAllEntities(): void {
    this._entityStates.clear();
    this._entityProfiles.clear();
    this._fightCooldowns.clear();
    this._dyingEntities.clear();
    this._nameIdMap.clear();
    this._interactionMatrix = null;
    this.state.entities.clear();
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

  /**
   * Build nameIdMap from current entity profiles.
   * Maps entity name -> sequential integer ID string for use in resolveInteraction.
   * Uses same logic as the client WorldStage version.
   */
  _buildNameIdMap(): void {
    this._nameIdMap.clear();
    let id = 1;
    const seen = new Set<string>();

    for (const profile of this._entityProfiles.values()) {
      if (!seen.has(profile.name)) {
        seen.add(profile.name);
        this._nameIdMap.set(profile.name, String(id++));
      }
    }
  }
}
