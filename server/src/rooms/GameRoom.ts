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
  @type('string') ownerSessionId: string = '';
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
  @type('string') parentEntityId: string = '';
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
  @type('number') currentRound: number = 0;
  @type('number') maxRounds: number = 5;
  @type('string') gameStatus: string = 'active';
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
  _pendingProfiles: Map<string, { profile: EntityProfile; teamId: string; imageDataUrl: string }> = new Map();
  // Count of in-flight recognition calls — must reach 0 before phase can advance
  _pendingRecognitions: number = 0;
  // Kill tracking: ownerSessionId -> kill count
  _killCounts: Map<string, number> = new Map();
  // Entities drawn tracking: ownerSessionId -> count drawn this game
  _entitiesDrawn: Map<string, number> = new Map();


  onCreate(options: Record<string, unknown> = {}): void {
    const maxPlayers = (options.maxPlayers as number) ?? 8;
    this.maxClients = maxPlayers;
    this.state.maxPlayers = maxPlayers;
    this.state.maxRounds = (options.maxRounds as number) ?? 5;

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
    this._pendingRecognitions = 0;
    this._killCounts = new Map();
    this._entitiesDrawn = new Map();

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

    this.onMessage('submit_drawing', (client: Client, msg: unknown) => {
      void this._handleSubmitDrawing(client, msg);
    });

    this.onMessage('return_to_lobby', (client: Client) => {
      this._handleReturnToLobby(client);
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
    const activePhasesForForfeit = ['draw', 'simulate', 'results'];

    // Forfeit detection: check before deleting player
    if (activePhasesForForfeit.includes(this.state.currentPhase)) {
      const leavingPlayer = this.state.players.get(client.sessionId);
      if (leavingPlayer) {
        const leavingTeam = leavingPlayer.team;
        const otherTeam = leavingTeam === 'red' ? 'blue' : 'red';

        // Delete the leaving player
        this.state.players.delete(client.sessionId);

        // Check if any remaining player is on the same team
        let teamStillHasPlayers = false;
        this.state.players.forEach((player) => {
          if (player.team === leavingTeam) teamStillHasPlayers = true;
        });

        if (!teamStillHasPlayers) {
          // Forfeit — other team wins
          this._finishGame(otherTeam as 'red' | 'blue' | 'draw');
        }
      } else {
        this.state.players.delete(client.sessionId);
      }
    } else {
      this.state.players.delete(client.sessionId);
    }

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
    // Phase timer — runs at 20Hz, decrement and advance when zero
    if (
      this.state.currentPhase === 'draw' ||
      this.state.currentPhase === 'simulate' ||
      this.state.currentPhase === 'results'
    ) {
      this.state.phaseTimer = Math.max(0, this.state.phaseTimer - deltaMS / 1000);
      if (this.state.phaseTimer <= 0) {
        this._advancePhase();
      }
    }

    // Only run entity simulation during the simulate phase
    if (this.state.currentPhase !== 'simulate') return;

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
          newSchema.ownerSessionId = originalSchema?.ownerSessionId ?? '';
          newSchema.parentEntityId = entityId;

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
  // Phase state machine
  // ---------------------------------------------------------------------------

  _advancePhase(): void {
    const world = WORLD_BOUNDS;

    if (this.state.currentPhase === 'draw') {
      // Wait for all recognition calls to complete before advancing
      if (this._pendingRecognitions > 0) {
        console.warn(`[advancePhase] draw phase stuck: _pendingRecognitions=${this._pendingRecognitions}, allSubmitted=${this._allPlayersSubmitted()}`);
        // Keep timer at 0 — _tick will retry _advancePhase next tick
        this.state.phaseTimer = 0;
        return;
      }

      // Spawn all pending profiles as entities simultaneously
      const entityTextures: Record<string, string> = {};
      for (const [sessionId, { profile, teamId, imageDataUrl }] of this._pendingProfiles) {
        const entityId = crypto.randomUUID();

        // Team-based x positioning
        let x: number;
        if (teamId === 'blue') {
          // Blue team: right half [width/2+40, width-40]
          x = world.width / 2 + 40 + Math.random() * (world.width / 2 - 80);
        } else {
          // Red team: left half [40, width/2-40]
          x = 40 + Math.random() * (world.width / 2 - 80);
        }
        const y = 40 + Math.random() * (world.height - 80);

        const schema = new EntitySchema();
        schema.entityId = entityId;
        schema.name = profile.name;
        schema.archetype = profile.archetype;
        schema.teamId = teamId;
        schema.ownerSessionId = sessionId;
        schema.x = x;
        schema.y = y;
        schema.hp = 1;

        const entityState = initEntityState(profile.archetype as Archetype, profile.speed, x, y);

        this.state.entities.set(entityId, schema);
        this._entityStates.set(entityId, entityState);
        this._entityProfiles.set(entityId, { ...profile });

        // Track entities drawn per player
        this._entitiesDrawn.set(sessionId, (this._entitiesDrawn.get(sessionId) ?? 0) + 1);

        // Map entityId to drawing texture for broadcast and future copy spawns
        if (imageDataUrl) {
          entityTextures[entityId] = imageDataUrl;
        }
      }

      this._pendingProfiles.clear();

      // Broadcast entity textures to all clients so they can render drawings
      if (Object.keys(entityTextures).length > 0) {
        this.broadcast('entity_textures', entityTextures);
      }

      // Transition to simulate
      this.state.currentPhase = 'simulate';
      this.state.phaseTimer = 30;
    } else if (this.state.currentPhase === 'simulate') {
      this.state.currentPhase = 'results';
      this.state.phaseTimer = 4;
    } else if (this.state.currentPhase === 'results') {
      // Reset hasSubmittedDrawing for new draw round
      this.state.players.forEach((player) => {
        player.hasSubmittedDrawing = false;
      });

      // Increment round counter
      this.state.currentRound++;

      // Check win condition before transitioning
      const winner = this._computeWinner();
      if (winner !== null) {
        this._finishGame(winner);
        return;
      }

      this.state.currentPhase = 'draw';
      this.state.phaseTimer = 60;
    }
  }

  async _handleSubmitDrawing(client: { sessionId: string }, msg: unknown): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Guard: only accept during draw phase
    if (this.state.currentPhase !== 'draw') return;

    // Guard: idempotent — reject if already submitted
    if (player.hasSubmittedDrawing) return;

    // Set synchronously before async recognition call
    player.hasSubmittedDrawing = true;
    this._pendingRecognitions++;

    const data = msg as Record<string, unknown>;
    const imageDataUrl = (typeof data?.imageDataUrl === 'string') ? data.imageDataUrl : '';

    try {
      const profile = await recognizeDrawingInternal(imageDataUrl);
      this._pendingProfiles.set(client.sessionId, { profile, teamId: player.team, imageDataUrl });
    } finally {
      this._pendingRecognitions--;

      // Early phase end only when all players submitted AND all recognitions complete
      if (this._allPlayersSubmitted() && this._pendingRecognitions === 0) {
        this.state.phaseTimer = 0;
      }
    }
  }

  _allPlayersSubmitted(): boolean {
    let allSubmitted = true;
    this.state.players.forEach((player) => {
      if (!player.hasSubmittedDrawing) allSubmitted = false;
    });
    return allSubmitted;
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

      // Track kill for attacker's owner
      const attackerSchema = this.state.entities.get(attackerId);
      if (attackerSchema?.ownerSessionId) {
        const ownerId = attackerSchema.ownerSessionId;
        this._killCounts.set(ownerId, (this._killCounts.get(ownerId) ?? 0) + 1);
      }
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

    // Auto-start: fire if all players ready, >= 2 connected, and in idle phase
    if (
      this.state.currentPhase === 'idle' &&
      (this.clients as unknown[]).length >= 2 &&
      this._allPlayersReady()
    ) {
      this._handleStartGame({ sessionId: this.state.hostSessionId });
    }
  }

  _allPlayersReady(): boolean {
    let allReady = true;
    this.state.players.forEach((player) => {
      if (!player.ready) allReady = false;
    });
    return allReady;
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

    // Full game state reset for clean start
    this._killCounts.clear();
    this._entitiesDrawn.clear();
    this._pendingProfiles.clear();
    this._pendingRecognitions = 0;
    this._handleRemoveAllEntities();
    this.state.currentRound = 0;

    // Reset all player submission flags
    this.state.players.forEach((player) => {
      player.hasSubmittedDrawing = false;
    });

    // Start the draw phase
    this.state.currentPhase = 'draw';
    this.state.phaseTimer = 60;
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

  // ---------------------------------------------------------------------------
  // Win condition
  // ---------------------------------------------------------------------------

  /**
   * Compute the winner based on current entity counts and round state.
   * Returns 'red', 'blue', 'draw', or null (game still ongoing).
   */
  _computeWinner(): 'red' | 'blue' | 'draw' | null {
    let red = 0;
    let blue = 0;
    this.state.entities.forEach((entity) => {
      if (entity.teamId === 'red') red++;
      else if (entity.teamId === 'blue') blue++;
    });

    // Elimination: one or both teams at 0
    if (red === 0 && blue === 0) return 'draw';
    if (red === 0) return 'blue';
    if (blue === 0) return 'red';

    // Round limit reached
    if (this.state.currentRound >= this.state.maxRounds) {
      if (red > blue) return 'red';
      if (blue > red) return 'blue';
      return 'draw';
    }

    // Game still ongoing
    return null;
  }

  /**
   * Build per-player stats for the game_finished broadcast.
   */
  _buildPlayerStats(): Record<string, { name: string; team: string; entitiesDrawn: number; entitiesSurviving: number; kills: number }> {
    const stats: Record<string, { name: string; team: string; entitiesDrawn: number; entitiesSurviving: number; kills: number }> = {};

    // Count surviving entities per owner
    const surviving = new Map<string, number>();
    this.state.entities.forEach((entity) => {
      if (entity.ownerSessionId) {
        surviving.set(entity.ownerSessionId, (surviving.get(entity.ownerSessionId) ?? 0) + 1);
      }
    });

    this.state.players.forEach((player, sessionId) => {
      stats[sessionId] = {
        name: player.name,
        team: player.team,
        entitiesDrawn: this._entitiesDrawn.get(sessionId) ?? 0,
        entitiesSurviving: surviving.get(sessionId) ?? 0,
        kills: this._killCounts.get(sessionId) ?? 0,
      };
    });

    return stats;
  }

  /**
   * Finish the game: set state to finished and broadcast game_finished.
   */
  _finishGame(winner: 'red' | 'blue' | 'draw'): void {
    this.state.currentPhase = 'finished';
    this.state.gameStatus = 'finished';
    this.state.phaseTimer = 0;

    const stats = this._buildPlayerStats();
    this.broadcast('game_finished', { winner, stats });
  }

  /**
   * Return to lobby: reset room state for a rematch.
   * Guard: only valid when currentPhase === 'finished'.
   */
  _handleReturnToLobby(_client: { sessionId: string }): void {
    if (this.state.currentPhase !== 'finished') return;

    // Reset game state
    this.state.currentPhase = 'idle';
    this.state.gameStatus = 'active';
    this.state.currentRound = 0;
    this.state.phaseTimer = 0;

    // Reset all player flags
    this.state.players.forEach((player) => {
      player.ready = false;
      player.hasSubmittedDrawing = false;
    });

    // Clear all entities and simulation state
    this._handleRemoveAllEntities();

    // Clear tracking maps and pending state
    this._killCounts.clear();
    this._entitiesDrawn.clear();
    this._pendingProfiles.clear();
    this._pendingRecognitions = 0;

    // Unlock room for new players
    this.unlock();
  }
}
