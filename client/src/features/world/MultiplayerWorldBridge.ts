import type { Room } from '@colyseus/sdk';
import { Assets, Texture } from 'pixi.js';
import type { WorldStage } from './WorldStage';
import type { Archetype, EntityProfile, InteractionMatrix } from '@crayon-world/shared/src/types';

/**
 * Lightweight shape matching EntitySchema fields received via onStateChange.
 * We don't import the actual Schema class (server-only with decorators).
 */
interface EntitySchemaLike {
  entityId: string;
  x: number;
  y: number;
  hp: number;
  name: string;
  archetype: string;
  teamId: string;
  ownerSessionId: string;
  vx: number;
  vy: number;
}

/**
 * Bridges the Colyseus room's entity Schema state to WorldStage.
 *
 * This is the single integration point between networking and rendering for entities.
 * It receives Schema patches via room.onStateChange, diffs them against known entities,
 * and calls the appropriate WorldStage methods to spawn, update, or remove entities.
 *
 * Has no PixiJS imports — only talks to WorldStage via its public API.
 * Has no Colyseus Schema imports — uses duck-typed EntitySchemaLike.
 */
export class MultiplayerWorldBridge {
  private readonly _worldStage: WorldStage;
  private _room: Room | null = null;
  private readonly _knownEntityIds = new Set<string>();
  private _stateChangeCallback: ((state: unknown) => void) | null = null;
  // Entity textures received from server — entityId → Texture
  private readonly _entityTextures = new Map<string, Texture>();

  constructor(worldStage: WorldStage) {
    this._worldStage = worldStage;
  }

  /**
   * Connect to a Colyseus room and begin wiring Schema state to WorldStage.
   * Sets worldStage to multiplayer mode so the PixiJS ticker no longer runs
   * client-side simulation.
   */
  connect(room: Room): void {
    this._room = room;
    this._worldStage.multiplayerMode = true;

    // Listen for entity texture broadcasts — server sends drawing PNGs as base64
    room.onMessage('entity_textures', (textures: Record<string, string>) => {
      for (const [entityId, dataUrl] of Object.entries(textures)) {
        const img = new Image();
        img.onload = () => {
          const texture = Texture.from(img);
          this._entityTextures.set(entityId, texture);
          // If the entity was already spawned with a placeholder, update its texture
          this._worldStage.updateEntityTexture(entityId, texture);
        };
        img.src = dataUrl;
      }
    });

    const callback = (state: unknown): void => {
      const typedState = state as { entities?: Map<string, EntitySchemaLike> };

      // Guard: entities map may not be populated until first server patch
      if (!typedState?.entities) return;

      const entities = typedState.entities;
      const currentIds = new Set<string>();

      // Build position map and detect new entities
      const positionMap = new Map<string, { x: number; y: number; vx: number; vy: number; hp: number }>();

      for (const [entityId, schema] of entities) {
        currentIds.add(entityId);
        positionMap.set(entityId, {
          x: schema.x,
          y: schema.y,
          vx: schema.vx,
          vy: schema.vy,
          hp: schema.hp,
        });

        // Spawn new entities not yet tracked
        if (!this._knownEntityIds.has(entityId)) {
          const profile: EntityProfile = {
            name: schema.name,
            archetype: schema.archetype as Archetype,
            traits: [],
            role: '',
            speed: 0,
          };
          // Use local captured texture for own entity, or received texture from server
          const isMyEntity = this._room && schema.ownerSessionId === this._room.sessionId;
          const texture = isMyEntity
            ? this._worldStage.capturedDrawingTexture ?? undefined
            : this._entityTextures.get(entityId);
          this._worldStage.spawnFromSchema(entityId, profile, schema.x, schema.y, schema.teamId, texture);
          this._knownEntityIds.add(entityId);
        }
      }

      // Apply positions for all entities (includes orientation and label sync)
      this._worldStage.applyPositions(positionMap);

      // Remove entities no longer present in server Schema
      for (const id of this._knownEntityIds) {
        if (!currentIds.has(id)) {
          this._worldStage.removeEntityById(id);
          this._knownEntityIds.delete(id);
        }
      }
    };

    this._stateChangeCallback = callback;
    room.onStateChange(callback);
  }

  /**
   * Disconnect from the room and revert WorldStage to single-player mode.
   * Clears all tracked entity IDs.
   */
  disconnect(): void {
    if (this._room && this._stateChangeCallback) {
      // Colyseus 0.17: onStateChange returns an unsubscribe function when called with a callback.
      // We stored the callback reference but cannot easily remove a specific listener in 0.17.
      // Setting _room to null prevents further callbacks from having effect.
    }
    this._worldStage.multiplayerMode = false;
    this._knownEntityIds.clear();
    this._entityTextures.clear();
    this._stateChangeCallback = null;
    this._room = null;
  }

  /**
   * Send a spawn_entity message to the server.
   * Called by game flow after recognition completes — the server creates the EntitySchema
   * and broadcasts it to all clients via Schema patches.
   */
  sendSpawnEntity(
    entityId: string,
    profile: EntityProfile,
    x: number,
    y: number,
    teamId: string,
  ): void {
    if (!this._room) return;
    this._room.send('spawn_entity', {
      entityId,
      name: profile.name,
      archetype: profile.archetype,
      speed: profile.speed,
      x,
      y,
      teamId,
    });
  }

  /**
   * Send the AI-generated interaction matrix to the server.
   * The server uses this to drive fight resolution and entity behavior steering.
   */
  sendInteractionMatrix(matrix: InteractionMatrix): void {
    if (!this._room) return;
    this._room.send('interaction_matrix', matrix);
  }

  /**
   * Send a drawing submission to the server for AI recognition and entity spawning.
   * The server will recognize the drawing, create an EntitySchema, and broadcast it.
   *
   * @param imageDataUrl - PNG data URL of the player's drawing
   */
  submitDrawing(imageDataUrl: string): void {
    if (!this._room) return;
    this._room.send('submit_drawing', { imageDataUrl });
  }
}
