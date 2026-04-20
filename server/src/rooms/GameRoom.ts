import { Room, Client } from '@colyseus/core';
import { Schema, type, MapSchema } from '@colyseus/schema';
import {
  dispatchBehavior,
  initEntityState,
  initProfileForMap,
  WORLD_BOUNDS,
} from '@crayon-world/shared/src/simulation/EntitySimulation.js';
import { recognizeDrawingInternal } from '../recognition/recognizeDrawingInternal.js';
import type {
  EntityState,
} from '@crayon-world/shared/src/simulation/EntitySimulation.js';
import {
  blendSteeringIntoAnimation,
  FIGHT_PROXIMITY_FRACTION,
} from '@crayon-world/shared/src/simulation/interactionBehaviors.js';

/** Per-pair re-hit cooldown after a collision — long enough for the bounce
 *  impulse to carry the entities apart and their steering to arc them back. */
const COLLISION_REHIT_MS = 450;
import type { EntityProfile, Archetype, MapType } from '@crayon-world/shared/src/types.js';
import { DEFAULT_STYLE_BY_ARCHETYPE, canSurvive } from '@crayon-world/shared/src/types.js';

const MAP_TYPES: MapType[] = ['land', 'water', 'air'];

/** Draw the next map from a shuffled bag — reshuffles once empty, so each set of
 * three rounds is guaranteed to contain one of each map. */
function makeMapBag(): () => MapType {
  let bag: MapType[] = [];
  return (): MapType => {
    if (bag.length === 0) {
      bag = [...MAP_TYPES];
      // Fisher–Yates in place
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
}

/** HP lost per second when an entity cannot survive the current map. */
const ENV_DAMAGE_DPS: Record<MapType, number> = {
  land: 8,    // water-only creatures suffocating
  water: 15,  // drowning
  air: 25,    // falling — fast death
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export class EntitySchema extends Schema {
  @type('string') entityId: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') hp: number = 1;
  @type('number') maxHp: number = 1;
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
  @type('number') drawingTime: number = 60;
  @type('string') gameStatus: string = 'active';
  @type('string') currentMapType: string = 'land';
  @type('number') redRoundWins: number = 0;
  @type('number') blueRoundWins: number = 0;
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
  _fightCooldowns: Map<string, number> = new Map();
  _bounceCooldowns: Map<string, number> = new Map(); // ms remaining after wall bounce
  _dyingEntities: Set<string> = new Set();
  // Pending profiles buffered during draw phase — spawned simultaneously at simulate start
  _pendingProfiles: Map<string, { profile: EntityProfile; teamId: string; imageDataUrl: string }> = new Map();
  // Count of in-flight recognition calls — must reach 0 before phase can advance
  _pendingRecognitions: number = 0;
  // Kill tracking: ownerSessionId -> kill count
  _killCounts: Map<string, number> = new Map();
  // Entities drawn tracking: ownerSessionId -> count drawn this game
  _entitiesDrawn: Map<string, number> = new Map();
  // Entities that can't survive the current map — drained each tick until dead.
  _envDyingEntities: Set<string> = new Set();
  // Per-game shuffled map bag — guarantees a balanced distribution of maps.
  _nextMap: () => MapType = makeMapBag();


  onCreate(options: Record<string, unknown> = {}): void {
    const maxPlayers = (options.maxPlayers as number) ?? 8;
    this.maxClients = maxPlayers;
    this.state.maxPlayers = maxPlayers;
    this.state.maxRounds = (options.maxRounds as number) ?? 5;
    this.state.drawingTime = (options.drawingTime as number) ?? 60;

    // Override roomId with a 4-char human-readable code
    this.roomId = this._generate4CharCode();

    if (options.isPrivate) {
      this.setPrivate(true);
    }

    // Initialize server-side simulation state
    this._entityStates = new Map();
    this._entityProfiles = new Map();
    this._fightCooldowns = new Map();
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

    // Early round end — if any team has been wiped out, stop the round.
    {
      let red = 0;
      let blue = 0;
      this.state.entities.forEach((e) => {
        if (e.teamId === 'red') red++;
        else if (e.teamId === 'blue') blue++;
      });
      if (red === 0 || blue === 0) {
        this.state.phaseTimer = 0;
        return;
      }
    }

    const dt = deltaMS / 1000;
    const world = WORLD_BOUNDS;
    const worldDiag = Math.sqrt(world.width * world.width + world.height * world.height);
    const fightProximity = worldDiag * FIGHT_PROXIMITY_FRACTION;
    const mapType = this.state.currentMapType as MapType;
    const envDps = ENV_DAMAGE_DPS[mapType];

    // Decrement fight cooldowns
    for (const [key, remaining] of this._fightCooldowns) {
      const updated = remaining - deltaMS;
      if (updated <= 0) {
        this._fightCooldowns.delete(key);
      } else {
        this._fightCooldowns.set(key, updated);
      }
    }

    // Decrement bounce cooldowns
    for (const [entityId, remaining] of this._bounceCooldowns) {
      const updated = remaining - deltaMS;
      if (updated <= 0) {
        this._bounceCooldowns.delete(entityId);
      } else {
        this._bounceCooldowns.set(entityId, updated);
      }
    }

    const toRemove: string[] = [];

    // Clean up dying entities immediately
    for (const entityId of this._dyingEntities) {
      toRemove.push(entityId);
    }

    // PHASE 1: Collision resolution — runs BEFORE per-entity movement so the
    // reflection mutates velocity/heading in-place and dispatchBehavior this
    // tick moves the entity in the reflected (backward) direction. Running it
    // after the main loop caused a visible forward "shoot-through" frame
    // because committed forward positions were sent to clients before the
    // reflection took effect next tick.
    {
      const ids = Array.from(this._entityStates.keys());
      const collisionRadiusSq = fightProximity * fightProximity;
      for (let i = 0; i < ids.length; i++) {
        const idA = ids[i];
        if (this._dyingEntities.has(idA)) continue;
        const schemaA = this.state.entities.get(idA);
        if (!schemaA?.teamId) continue;
        const stateA = this._entityStates.get(idA);
        if (!stateA) continue;
        for (let j = i + 1; j < ids.length; j++) {
          const idB = ids[j];
          if (this._dyingEntities.has(idB)) continue;
          const schemaB = this.state.entities.get(idB);
          if (!schemaB?.teamId || schemaB.teamId === schemaA.teamId) continue;
          const stateB = this._entityStates.get(idB);
          if (!stateB) continue;
          const dx = stateB.x - stateA.x;
          const dy = stateB.y - stateA.y;
          if (dx * dx + dy * dy < collisionRadiusSq) {
            this._resolveCollision(idA, idB, toRemove);
          }
        }
      }
    }

    // PHASE 2: per-entity dispatch + chase + wall bounce + commit.
    for (const [entityId, state] of this._entityStates) {
      // Skip dying entities — handled in toRemove above
      if (this._dyingEntities.has(entityId)) continue;

      let newState: EntityState;
      const isMovable = state.archetype === 'walking' || state.archetype === 'flying';
      const isBouncing = this._bounceCooldowns.has(entityId);
      const selfSchema = this.state.entities.get(entityId);
      const myTeam = selfSchema?.teamId;

      // Default: pure archetype behavior.
      newState = dispatchBehavior(state, dt, world);

      // Cross-team chase/fight — walking and flying entities seek the nearest
      // opposing-team entity and blend steering toward it. Teammates ignore
      // each other. Non-movable archetypes (rooted, drifting, stationary) just
      // play out their own animation and can be attacked but do not chase.
      if (isMovable && myTeam && !isBouncing) {
        let nearestId: string | null = null;
        let nearestDistSq = Infinity;
        let nearestState: EntityState | undefined;
        for (const [otherId, otherState] of this._entityStates) {
          if (otherId === entityId) continue;
          if (this._dyingEntities.has(otherId)) continue;
          const otherSchema = this.state.entities.get(otherId);
          if (!otherSchema || otherSchema.teamId === myTeam) continue;
          const dx = otherState.x - state.x;
          const dy = otherState.y - state.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < nearestDistSq) {
            nearestDistSq = d2;
            nearestId = otherId;
            nearestState = otherState;
          }
        }

        if (nearestId && nearestState) {
          const distance = Math.sqrt(nearestDistSq);
          newState = blendSteeringIntoAnimation(
            newState,
            { type: 'chase', targetContainer: nearestId, distance },
            nearestState,
            worldDiag,
          );
          // Collision resolution runs in a separate post-pass so it can mutate
          // committed state without being overwritten by this tick's commit.
        }
      }

      // Bounce off world borders — reverse velocity AND reflect heading so
      // heading-driven behaviors (flying, walking after timer expiry) don't
      // immediately re-derive a velocity pointing back into the wall.
      const halfSize = 40;
      let bounced = false;
      if (newState.x < halfSize || newState.x > world.width - halfSize) {
        const clampedX = Math.max(halfSize, Math.min(world.width - halfSize, newState.x));
        const vx = 'vx' in newState ? -(newState as { vx: number }).vx : 0;
        const patch: Record<string, number> = { x: clampedX, vx };
        if ('heading' in newState) {
          patch.heading = Math.PI - (newState as { heading: number }).heading;
        }
        newState = { ...newState, ...patch } as EntityState;
        bounced = true;
      }
      if (newState.y < halfSize || newState.y > world.height - halfSize) {
        const clampedY = Math.max(halfSize, Math.min(world.height - halfSize, newState.y));
        const vy = 'vy' in newState ? -(newState as { vy: number }).vy : 0;
        const patch: Record<string, number> = { y: clampedY, vy };
        if ('heading' in newState) {
          patch.heading = -(newState as { heading: number }).heading;
        }
        newState = { ...newState, ...patch } as EntityState;
        bounced = true;
      }
      if (bounced) {
        this._bounceCooldowns.set(entityId, 500); // 500ms cooldown
      }

      // Environmental damage — entities that can't survive this map drain HP each tick.
      if (this._envDyingEntities.has(entityId)) {
        const schema = this.state.entities.get(entityId);
        if (schema && schema.hp > 0) {
          schema.hp = Math.max(0, schema.hp - envDps * dt);
          if (schema.hp <= 0 && !this._dyingEntities.has(entityId)) {
            this._dyingEntities.add(entityId);
            toRemove.push(entityId);
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
      this._envDyingEntities.delete(entityId);
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
        // Keep timer at 0 — _tick will retry _advancePhase next tick
        this.state.phaseTimer = 0;
        return;
      }

      // Spawn all pending profiles as entities simultaneously
      const entityTextures: Record<string, string> = {};
      const mapType = this.state.currentMapType as MapType;
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

        // Resolve effective behavior for this map. If the creature can't survive,
        // spawn it anyway with a placeholder motion so it's visible as it dies.
        const init = initProfileForMap(profile, mapType)
          ?? {
            archetype: 'stationary' as Archetype,
            movementStyle: DEFAULT_STYLE_BY_ARCHETYPE['stationary'],
            speed: 1,
            agility: profile.agility,
            energy: profile.energy,
          };
        const survives = canSurvive(profile, mapType);

        const schema = new EntitySchema();
        schema.entityId = entityId;
        schema.name = profile.name;
        schema.archetype = init.archetype;
        schema.teamId = teamId;
        schema.ownerSessionId = sessionId;
        schema.x = x;
        schema.y = y;
        schema.hp = profile.maxHealth;
        schema.maxHp = profile.maxHealth;

        const entityState = initEntityState(init, x, y);

        this.state.entities.set(entityId, schema);
        this._entityStates.set(entityId, entityState);
        this._entityProfiles.set(entityId, { ...profile });
        if (!survives) this._envDyingEntities.add(entityId);

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
      this.state.phaseTimer = 60;
    } else if (this.state.currentPhase === 'simulate') {
      // Tally this round's winner before entities are cleared. Tied rounds
      // (including 0-0) award no points.
      let red = 0;
      let blue = 0;
      this.state.entities.forEach((entity) => {
        if (entity.teamId === 'red') red++;
        else if (entity.teamId === 'blue') blue++;
      });
      if (red > blue) this.state.redRoundWins++;
      else if (blue > red) this.state.blueRoundWins++;

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

      // Entities do not persist between rounds — clear before the new draw phase.
      this._handleRemoveAllEntities();

      // Pick a fresh map for the upcoming round so players see it during drawing.
      this.state.currentMapType = this._nextMap();

      this.state.currentPhase = 'draw';
      this.state.phaseTimer = this.state.drawingTime;
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
      const profile = await recognizeDrawingInternal(
        imageDataUrl,
        this.state.currentMapType as MapType,
      );
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
  // Collision resolution — physics-based impact between two opposing entities.
  // Called from the chase loop when they come within the fight proximity.
  // ---------------------------------------------------------------------------

  _resolveCollision(idA: string, idB: string, toRemove: string[]): void {
    // Canonical cooldown key so both sides of a pair share one re-hit timer.
    const key = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
    if (this._fightCooldowns.has(key)) return;

    const schemaA = this.state.entities.get(idA);
    const schemaB = this.state.entities.get(idB);
    const stateA = this._entityStates.get(idA);
    const stateB = this._entityStates.get(idB);
    const profileA = this._entityProfiles.get(idA);
    const profileB = this._entityProfiles.get(idB);
    if (!schemaA || !schemaB || !stateA || !stateB) return;

    // Collision normal A -> B. If they're perfectly coincident fall back to
    // +x so reflection still produces a sensible direction.
    const dx = stateB.x - stateA.x;
    const dy = stateB.y - stateA.y;
    const rawDist = Math.sqrt(dx * dx + dy * dy);
    const dist = rawDist || 1;
    const nx = rawDist > 0 ? dx / dist : 1;
    const ny = rawDist > 0 ? dy / dist : 0;

    const vxA = 'vx' in stateA ? (stateA as { vx: number }).vx : 0;
    const vyA = 'vy' in stateA ? (stateA as { vy: number }).vy : 0;
    const vxB = 'vx' in stateB ? (stateB as { vx: number }).vx : 0;
    const vyB = 'vy' in stateB ? (stateB as { vy: number }).vy : 0;

    // Closing speed along the collision normal. If it's <= 0, they're already
    // grazing past each other and we don't reflect — only damage.
    const approachSpeed = (vxA - vxB) * nx + (vyA - vyB) * ny;
    const closing = Math.max(0, approachSpeed);

    // Damage scales with closing speed (momentum-based). Both entities take it.
    const BASE_DAMAGE = 5;
    const VELOCITY_DAMAGE_K = 0.12;
    const damage = Math.round(BASE_DAMAGE + Math.min(35, closing * VELOCITY_DAMAGE_K));
    schemaA.hp = Math.max(0, schemaA.hp - damage);
    schemaB.hp = Math.max(0, schemaB.hp - damage);

    // Velocity reflection along the collision normal. Strong fixed restitution
    // so the bounce is always visually decisive — fast entities can't shoot
    // through. Agility affects how quickly chase steering re-engages (see
    // below), not the bounce magnitude itself.
    const RESTITUTION = 0.9;
    const canReflect = (s: EntityState): s is EntityState & { vx: number; vy: number; heading: number } =>
      s.archetype === 'walking' || s.archetype === 'flying';

    if (closing > 0 && canReflect(stateA)) {
      const vAn = vxA * nx + vyA * ny;
      const deltaA = -(1 + RESTITUTION) * Math.max(0, vAn);
      const newVxA = vxA + deltaA * nx;
      const newVyA = vyA + deltaA * ny;
      (stateA as { vx: number }).vx = newVxA;
      (stateA as { vy: number }).vy = newVyA;
      (stateA as { heading: number }).heading = Math.atan2(newVyA, newVxA);
    }
    if (closing > 0 && canReflect(stateB)) {
      const vBn = vxB * nx + vyB * ny;
      const deltaB = -(1 + RESTITUTION) * Math.min(0, vBn);
      const newVxB = vxB + deltaB * nx;
      const newVyB = vyB + deltaB * ny;
      (stateB as { vx: number }).vx = newVxB;
      (stateB as { vy: number }).vy = newVyB;
      (stateB as { heading: number }).heading = Math.atan2(newVyB, newVxB);
    }

    // Position separation — push them apart well beyond the collision surface
    // so they clearly disengage and the reflected motion has room to carry
    // them out of range before the next tick.
    const worldDiag = Math.sqrt(WORLD_BOUNDS.width * WORLD_BOUNDS.width + WORLD_BOUNDS.height * WORLD_BOUNDS.height);
    const desiredGap = worldDiag * FIGHT_PROXIMITY_FRACTION * 2.0;
    const overlap = desiredGap - rawDist;
    if (overlap > 0) {
      const movA = canReflect(stateA);
      const movB = canReflect(stateB);
      const shareA = movA ? (movB ? 0.5 : 1) : 0;
      const shareB = movB ? (movA ? 0.5 : 1) : 0;
      if (shareA > 0) {
        (stateA as { x: number }).x -= nx * overlap * shareA;
        (stateA as { y: number }).y -= ny * overlap * shareA;
      }
      if (shareB > 0) {
        (stateB as { x: number }).x += nx * overlap * shareB;
        (stateB as { y: number }).y += ny * overlap * shareB;
      }
    }

    // Chase suppression — agility decides how long the entity stays "dazed"
    // before re-targeting. High agility recovers fast; low agility stays
    // flung for longer. Gives the reflected motion time to play out visually.
    const suppressMs = (agility: number): number =>
      250 + (1 - Math.max(1, Math.min(10, agility)) / 10) * 550; // 250..800
    if (canReflect(stateA)) this._bounceCooldowns.set(idA, suppressMs(profileA?.agility ?? 5));
    if (canReflect(stateB)) this._bounceCooldowns.set(idB, suppressMs(profileB?.agility ?? 5));

    // Re-hit cooldown for the pair.
    this._fightCooldowns.set(key, COLLISION_REHIT_MS);

    this.broadcast('attack', { attackerId: idA, targetId: idB });

    // Kill tracking — in a mutual-kill, both owners get credit for the other.
    if (schemaA.hp <= 0 && !this._dyingEntities.has(idA)) {
      this._dyingEntities.add(idA);
      toRemove.push(idA);
      if (schemaB.ownerSessionId) {
        this._killCounts.set(
          schemaB.ownerSessionId,
          (this._killCounts.get(schemaB.ownerSessionId) ?? 0) + 1,
        );
      }
    }
    if (schemaB.hp <= 0 && !this._dyingEntities.has(idB)) {
      this._dyingEntities.add(idB);
      toRemove.push(idB);
      if (schemaA.ownerSessionId) {
        this._killCounts.set(
          schemaA.ownerSessionId,
          (this._killCounts.get(schemaA.ownerSessionId) ?? 0) + 1,
        );
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

    const habitat = (data.habitat as EntityProfile['habitat']) ?? 'land';

    // Build a profile using defaults for fields the client message omits.
    const profile: EntityProfile = {
      name,
      archetype,
      movementStyle: (data.movementStyle as EntityProfile['movementStyle'])
        ?? DEFAULT_STYLE_BY_ARCHETYPE[archetype],
      habitat,
      landSpeed: habitat === 'land' ? speed : undefined,
      waterSpeed: habitat === 'water' ? speed : undefined,
      airSpeed: habitat === 'air' ? speed : undefined,
      agility: typeof data.agility === 'number' ? data.agility : 5,
      energy: typeof data.energy === 'number' ? data.energy : 5,
      maxHealth: typeof data.maxHealth === 'number' ? data.maxHealth : 30,
    };

    // Create EntitySchema for network sync
    const schema = new EntitySchema();
    schema.entityId = entityId;
    schema.name = name;
    schema.archetype = archetype;
    schema.teamId = teamId;
    schema.x = x;
    schema.y = y;
    schema.hp = profile.maxHealth;
    schema.maxHp = profile.maxHealth;

    // Create EntityState for server-side simulation
    const entityState = initEntityState(
      { archetype, movementStyle: profile.movementStyle, speed, agility: profile.agility, energy: profile.energy },
      x,
      y,
    );

    this.state.entities.set(entityId, schema);
    this._entityStates.set(entityId, entityState);
    this._entityProfiles.set(entityId, profile);
  }

  _handleRemoveAllEntities(): void {
    this._entityStates.clear();
    this._entityProfiles.clear();
    this._fightCooldowns.clear();
    this._bounceCooldowns.clear();
    this._dyingEntities.clear();
    this._envDyingEntities.clear();
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

    // All non-host players must be ready
    let allReady = true;
    this.state.players.forEach((player, sid) => {
      if (sid !== this.state.hostSessionId && !player.ready) allReady = false;
    });
    if (!allReady) return;

    // Teams must be balanced
    let red = 0;
    let blue = 0;
    this.state.players.forEach((player) => {
      if (player.team === 'red') red++;
      else if (player.team === 'blue') blue++;
    });
    if (red !== blue) return;

    this.broadcast('game_starting', { startedBy: client.sessionId });
    this.lock();

    // Full game state reset for clean start
    this._killCounts.clear();
    this._entitiesDrawn.clear();
    this._pendingProfiles.clear();
    this._pendingRecognitions = 0;
    this._handleRemoveAllEntities();
    this.state.currentRound = 0;
    this.state.redRoundWins = 0;
    this.state.blueRoundWins = 0;

    // Reset all player submission flags
    this.state.players.forEach((player) => {
      player.hasSubmittedDrawing = false;
    });

    // Fresh shuffled bag per game so a rematch doesn't inherit leftover ordering.
    this._nextMap = makeMapBag();
    // Pick the first round's map so players see it during drawing.
    this.state.currentMapType = this._nextMap();

    // Start the draw phase
    this.state.currentPhase = 'draw';
    this.state.phaseTimer = this.state.drawingTime;
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

  // ---------------------------------------------------------------------------
  // Win condition
  // ---------------------------------------------------------------------------

  /**
   * Compute the winner based on current entity counts and round state.
   * Returns 'red', 'blue', 'draw', or null (game still ongoing).
   */
  _computeWinner(): 'red' | 'blue' | 'draw' | null {
    // The full round count is always played — no mid-game elimination.
    // Player forfeit (last teammate disconnects) is handled separately in onLeave.
    if (this.state.currentRound < this.state.maxRounds) return null;

    const red = this.state.redRoundWins;
    const blue = this.state.blueRoundWins;
    if (red > blue) return 'red';
    if (blue > red) return 'blue';
    return 'draw';
  }

  /**
   * Build per-player stats for the game_finished broadcast.
   */
  _buildPlayerStats(): Record<string, { name: string; team: string; entitiesDrawn: number; kills: number }> {
    const stats: Record<string, { name: string; team: string; entitiesDrawn: number; kills: number }> = {};

    this.state.players.forEach((player, sessionId) => {
      stats[sessionId] = {
        name: player.name,
        team: player.team,
        entitiesDrawn: this._entitiesDrawn.get(sessionId) ?? 0,
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
    const roundWins = { red: this.state.redRoundWins, blue: this.state.blueRoundWins };
    this.broadcast('game_finished', { winner, stats, roundWins });
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
    this.state.redRoundWins = 0;
    this.state.blueRoundWins = 0;

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
