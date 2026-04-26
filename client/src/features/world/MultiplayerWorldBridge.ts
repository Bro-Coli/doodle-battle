import type { Room } from '@colyseus/sdk';
import { Assets, Texture } from 'pixi.js';
import type { WorldStage } from './WorldStage';
import type { Archetype, EntityProfile, MapType } from '@crayon-world/shared/src/types';
import { DEFAULT_STYLE_BY_ARCHETYPE } from '@crayon-world/shared/src/types';

/**
 * Lightweight shape matching EntitySchema fields received via onStateChange.
 * We don't import the actual Schema class (server-only with decorators).
 */
interface EntitySchemaLike {
  entityId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  name: string;
  archetype: string;
  teamId: string;
  ownerSessionId: string;
  vx: number;
  vy: number;
  parentEntityId: string;
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
  private _removeTextureHandler: (() => void) | null = null;
  private _removeAttackHandler: (() => void) | null = null;
  // Track currentPhase to detect round restart and wipe any leftover corpses.
  private _lastPhase: string | null = null;
  // Entity textures received from server — entityId → Texture
  private readonly _entityTextures = new Map<string, Texture>();
  // Copies waiting for parent texture — parentEntityId → set of child entityIds
  private readonly _pendingCopyTextures = new Map<string, Set<string>>();

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

    // Listen for entity texture broadcasts — server sends drawing PNGs as base64.
    // The exported PNGs have a white background (for Claude API), so we strip it
    // to transparent by clearing white pixels before creating the texture.
    this._removeAttackHandler = room.onMessage('attack', (msg: { attackerId: string; targetId: string }) => {
      this._worldStage.triggerAttackLungeById(msg.attackerId, msg.targetId);
    });

    this._removeTextureHandler = room.onMessage('entity_textures', (textures: Record<string, string>) => {
      for (const [entityId, dataUrl] of Object.entries(textures)) {
        const img = new Image();
        img.onload = () => {
          // Draw to canvas and strip white background
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Strip near-white pixels (including anti-aliased edges) to transparent.
            // Threshold of 200 catches light grays from stroke anti-aliasing
            // without affecting colored drawings.
            if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);

          const texture = Texture.from(canvas);
          this._entityTextures.set(entityId, texture);
          this._worldStage.updateEntityTexture(entityId, texture);

          // Apply to any copies that spawned before this texture arrived
          const pendingCopies = this._pendingCopyTextures.get(entityId);
          if (pendingCopies) {
            for (const copyId of pendingCopies) {
              this._entityTextures.set(copyId, texture);
              this._worldStage.updateEntityTexture(copyId, texture);
            }
            this._pendingCopyTextures.delete(entityId);
          }
        };
        img.src = dataUrl;
      }
    });

    const callback = (state: unknown): void => {
      // Wrap in try/catch — Colyseus invokes onStateChange listeners in
      // registration order. If this bridge throws, GameScreen's listener
      // (which clears the drawing canvas on phase change) might not run.
      try {
        this._processStateChange(state);
      } catch (err) {
        console.error('[MultiplayerWorldBridge] state change handler failed:', err);
      }
    };

    this._stateChangeCallback = callback;
    room.onStateChange(callback);
  }

  /**
   * Body of the room.onStateChange callback. Separated so the wrapper can
   * try/catch without pyramiding the indentation.
   *
   * Single-principle cleanup: every state callback, destroy any container
   * WorldStage tracks whose entityId is not in the current schema — UNLESS
   * we're in simulate phase AND the container is mid-death (so animations
   * finish and dead-on-land corpses persist for the rest of the round).
   *
   * Why this works without phase-transition gymnastics:
   *  - Survivors at round end disappear from the schema → orphaned →
   *    destroyed (no animation) on the very next state callback that
   *    observes phase ≠ 'simulate'.
   *  - Mid-round deaths during simulate still go through removeEntityById
   *    (below) → animation / corpse mark → preserveDying skips them in
   *    cleanupOrphans so the visual completes.
   *  - Even if Colyseus delivers patches such that we go straight from
   *    "round N simulate" to "round N+1 simulate" without observing the
   *    intermediate draw phase, the new round's state has fresh UUIDs;
   *    every old container is an orphan. The per-entity death loop and
   *    cleanupOrphans together wipe them all (the `isMissedTransition`
   *    flag below ensures stale survivors are NOT animated as deaths).
   */
  private _processStateChange(state: unknown): void {
    const typedState = state as {
      entities?: Map<string, EntitySchemaLike>;
      currentMapType?: string;
      currentPhase?: string;
    };

    if (typedState?.currentMapType) {
      this._worldStage.setMapType(typedState.currentMapType as MapType);
    }
    if (typedState?.currentPhase) {
      this._lastPhase = typedState.currentPhase;
    }

    if (!typedState?.entities) return;
    const entities = typedState.entities;

    // Build current state snapshot.
    const currentIds = new Set<string>();
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
    }

    const isInSimulate = typedState?.currentPhase === 'simulate';

    // Detect missed round transition: in 'simulate' but the schema has
    // brand-new entity IDs alongside old tracked IDs (no overlap). Server
    // uses crypto.randomUUID per spawn so any overlap means same round.
    let isMissedTransition = false;
    if (isInSimulate && currentIds.size > 0 && this._knownEntityIds.size > 0) {
      isMissedTransition = true;
      for (const id of this._knownEntityIds) {
        if (currentIds.has(id)) {
          isMissedTransition = false;
          break;
        }
      }
    }

    // (A) Mid-round death animations — only when truly mid-round.
    // Skip during a missed transition so stale survivors don't get
    // incorrectly death-animated and turned into corpses.
    if (isInSimulate && !isMissedTransition) {
      for (const id of Array.from(this._knownEntityIds)) {
        if (!currentIds.has(id)) {
          this._worldStage.removeEntityById(id);
          this._knownEntityIds.delete(id);
        }
      }
    }

    // (B) Universal orphan sweep. Destroys any WorldStage-tracked container
    // not in the current schema. During simulate, mid-death entities are
    // preserved so animations / corpses complete; during any other phase
    // (results, draw, idle, missed transition) ALL orphans are wiped.
    const preserveDying = isInSimulate && !isMissedTransition;
    this._worldStage.cleanupOrphans(currentIds, preserveDying);

    // (C) Sync bridge tracking with WorldStage. Anything WorldStage no
    // longer has must not stay in `_knownEntityIds`.
    for (const id of Array.from(this._knownEntityIds)) {
      if (!this._worldStage.hasEntity(id)) {
        this._knownEntityIds.delete(id);
      }
    }

    // (D) Spawn new entities.
    for (const [entityId, schema] of entities) {
      if (!this._knownEntityIds.has(entityId)) {
        const profile: EntityProfile = {
          name: schema.name,
          archetype: schema.archetype as Archetype,
          movementStyle: DEFAULT_STYLE_BY_ARCHETYPE[schema.archetype as Archetype],
          habitat: 'land',
          agility: 5,
          energy: 5,
          maxHealth: schema.maxHp ?? 1,
        };
        const isMyEntity = this._room && schema.ownerSessionId === this._room.sessionId;
        let texture: Texture | undefined;
        if (isMyEntity && !schema.parentEntityId) {
          texture = this._worldStage.capturedDrawingTexture ?? undefined;
        } else if (schema.parentEntityId) {
          texture = this._entityTextures.get(schema.parentEntityId);
          if (!texture) {
            let pending = this._pendingCopyTextures.get(schema.parentEntityId);
            if (!pending) {
              pending = new Set();
              this._pendingCopyTextures.set(schema.parentEntityId, pending);
            }
            pending.add(entityId);
          }
        } else {
          texture = this._entityTextures.get(entityId);
        }
        this._worldStage.spawnFromSchema(entityId, profile, schema.x, schema.y, schema.teamId, texture);
        this._knownEntityIds.add(entityId);
      }
    }

    // (E) Apply latest positions / velocities / HP bars.
    this._worldStage.applyPositions(positionMap);
  }

  /**
   * Disconnect from the room and revert WorldStage to single-player mode.
   * Clears all tracked entity IDs.
   */
  disconnect(): void {
    if (this._room && this._stateChangeCallback) {
      this._room.onStateChange.remove(this._stateChangeCallback);
    }
    if (this._removeTextureHandler) {
      this._removeTextureHandler();
      this._removeTextureHandler = null;
    }
    if (this._removeAttackHandler) {
      this._removeAttackHandler();
      this._removeAttackHandler = null;
    }
    this._worldStage.multiplayerMode = false;
    this._knownEntityIds.clear();
    this._entityTextures.clear();
    this._pendingCopyTextures.clear();
    this._lastPhase = null;
    this._stateChangeCallback = null;
    this._room = null;
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
