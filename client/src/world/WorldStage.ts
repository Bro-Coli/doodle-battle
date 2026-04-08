import { Application, Container, Ticker, Texture } from 'pixi.js';
import { EntityProfile, InteractionMatrix } from '@crayon-world/shared/src/types';
import { captureEntityTexture } from './captureEntityTexture';
import { buildEntityContainer } from './EntitySprite';
import { EntityState, SpreadingState, initEntityState, dispatchBehavior } from './EntitySimulation';
import { fetchInteractions } from './fetchInteractions';
import { RoundOverlay } from './RoundOverlay';
import { resolveInteraction, applyInteractionSteering, DETECTION_RANGE, FIGHT_PROXIMITY_PX, FIGHT_COOLDOWN_MS } from './interactionBehaviors';

/**
 * Round lifecycle phases.
 * - idle: no active round; entities are frozen
 * - analyzing: waiting for AI interaction matrix (spinner shown)
 * - simulating: entities moving and interacting; 30s countdown active
 *
 * No intermediate 'done' state — _endRound() transitions directly simulating -> idle.
 */
export type RoundPhase = 'idle' | 'analyzing' | 'simulating';

/**
 * WorldStage manages the dual-container architecture: draw mode / world mode.
 *
 * - `drawingRoot` holds the drawing canvas region.
 * - `worldRoot` holds all spawned entity containers.
 *
 * Toggle between draw mode and world mode by calling `toggle()`.
 * Spawn entities from the stroke container via `spawnEntity()`.
 */
export class WorldStage {
  private readonly _drawingRoot: Container;
  private readonly _worldRoot: Container;
  private readonly _app: Application;
  private _inWorld = false;

  // Round state machine
  private _roundPhase: RoundPhase = 'idle';
  private _dyingEntities = new Set<Container>();
  private _interactionMatrix: InteractionMatrix | null = null;
  private _roundTimer: number | null = null;
  private readonly _roundOverlay: RoundOverlay;
  private _onRoundPhaseChange: ((phase: RoundPhase) => void) | null = null;

  // Simulation state maps — keyed by entity container
  private readonly _entityStates = new Map<Container, EntityState>();
  private readonly _entityTextures = new Map<Container, Texture>();
  private readonly _entityProfiles = new Map<Container, EntityProfile>();
  private readonly _entityLabels = new Map<Container, Container>();
  private readonly _entitySpriteHeights = new Map<Container, number>();
  private readonly _entityHp = new Map<Container, number>();
  private readonly _nameIdMap = new Map<string, string>();
  private readonly _fightCooldowns = new Map<string, number>();

  constructor(app: Application) {
    this._app = app;
    this._drawingRoot = new Container();
    this._worldRoot = new Container();
    this._roundOverlay = new RoundOverlay();

    app.stage.addChild(this._drawingRoot);
    app.stage.addChild(this._worldRoot);

    // Start in draw mode — world is hidden
    this._worldRoot.visible = false;

    // Register single shared ticker for all entity simulation
    app.ticker.add(this._gameTick);
  }

  get drawingRoot(): Container {
    return this._drawingRoot;
  }

  get worldRoot(): Container {
    return this._worldRoot;
  }

  get inWorld(): boolean {
    return this._inWorld;
  }

  /** Number of active (non-dying) entities in the world. */
  get entityCount(): number {
    return this._entityStates.size;
  }

  /** Current round phase. */
  get roundPhase(): RoundPhase {
    return this._roundPhase;
  }

  /** Interaction matrix from the last completed AI call; null between rounds. */
  get interactionMatrix(): InteractionMatrix | null {
    return this._interactionMatrix;
  }

  /** Register a callback invoked whenever the round phase changes. */
  set onRoundPhaseChange(cb: ((phase: RoundPhase) => void) | null) {
    this._onRoundPhaseChange = cb;
  }

  /** Toggle between draw mode and world mode. */
  toggle(): void {
    this._inWorld = !this._inWorld;
    this._drawingRoot.visible = !this._inWorld;
    this._worldRoot.visible = this._inWorld;
  }

  /**
   * Capture the current drawing as a texture and spawn an entity in the world.
   *
   * @param app - The PixiJS Application
   * @param strokeContainer - Container holding committed strokes (must have children)
   * @param profile - Entity identity from the recognition pipeline
   */
  spawnEntity(app: Application, strokeContainer: Container, profile: EntityProfile): void {
    const texture = captureEntityTexture(app, strokeContainer);
    const { entity, label, spriteHeight } = buildEntityContainer(texture, profile, app);

    // Position randomly within canvas with 50px margin from edges
    const margin = 50;
    entity.x = margin + Math.random() * (app.screen.width - margin * 2);
    entity.y = margin + Math.random() * (app.screen.height - margin * 2);

    // Label is a sibling — not affected by entity rotation/flip
    label.x = entity.x;
    label.y = entity.y - spriteHeight / 2 - 6;

    this._worldRoot.addChild(entity);
    this._worldRoot.addChild(label);

    // Initialize simulation state for this entity
    const state = initEntityState(profile.archetype, profile.speed, entity.x, entity.y);
    this._entityStates.set(entity, state);
    this._entityTextures.set(entity, texture);
    this._entityProfiles.set(entity, profile);
    this._entityLabels.set(entity, label);
    this._entitySpriteHeights.set(entity, spriteHeight);
    this._entityHp.set(entity, 1);
  }

  /**
   * Single shared game tick — drives all entity simulation.
   * Registered once in the constructor; iterates all entity states.
   */
  private readonly _gameTick = (ticker: Ticker): void => {
    // Freeze all entities when not in simulation phase (idle or analyzing)
    if (this._roundPhase !== 'simulating') return;

    const dt = ticker.deltaMS / 1000;
    const world = { width: this._app.screen.width, height: this._app.screen.height };

    // Decrement fight cooldowns
    for (const [key, remaining] of this._fightCooldowns) {
      const next = remaining - ticker.deltaMS;
      if (next <= 0) this._fightCooldowns.delete(key);
      else this._fightCooldowns.set(key, next);
    }

    for (const [container, state] of this._entityStates) {
      // Skip dying entities — they are handled by their own fade-out ticker callback
      if (this._dyingEntities.has(container)) continue;

      const isMovable = state.archetype !== 'rooted' && state.archetype !== 'stationary';

      const resolved = (this._interactionMatrix && isMovable)
        ? resolveInteraction(
            container,
            this._entityStates,
            this._entityProfiles,
            this._dyingEntities,
            this._interactionMatrix,
            this._nameIdMap,
            DETECTION_RANGE,
          )
        : null;

      let newState: EntityState;

      if (resolved) {
        const targetState = this._entityStates.get(resolved.targetContainer);
        if (targetState) {
          newState = applyInteractionSteering(state, resolved, targetState, dt);

          // Fight contact check — 'chase' means predator caught prey; 'fight' means hostile contact
          if ((resolved.type === 'fight' || resolved.type === 'chase') && resolved.distance < FIGHT_PROXIMITY_PX) {
            this._handleFightContact(container, resolved.targetContainer);
          }
        } else {
          newState = dispatchBehavior(state, dt, world);
        }
      } else {
        newState = dispatchBehavior(state, dt, world);
      }

      // Write position to container
      container.x = newState.x;
      container.y = newState.y;

      // Orientation for walking and flying — feet always face down.
      // Horizontal flip for left/right, tilt up to ±45° for vertical movement.
      if (newState.archetype === 'walking' || newState.archetype === 'flying') {
        if (Math.abs(newState.vx) > 0.01) {
          container.scale.x =
            newState.vx < 0 ? -Math.abs(container.scale.x) : Math.abs(container.scale.x);
        }
        const speed = Math.sqrt(newState.vx * newState.vx + newState.vy * newState.vy);
        if (speed > 0.01) {
          const tilt = Math.asin(Math.max(-1, Math.min(1, newState.vy / speed)));
          const maxTilt = Math.PI / 4; // 45 degrees
          container.rotation = Math.max(-maxTilt, Math.min(maxTilt, tilt));
        }
      }

      // Sync label position — label is a sibling, always upright
      const label = this._entityLabels.get(container);
      const spriteH = this._entitySpriteHeights.get(container);
      if (label && spriteH !== undefined) {
        label.x = newState.x;
        label.y = newState.y - spriteH / 2 - 6;
      }

      // Handle spreading copy spawn signal
      if (newState.archetype === 'spreading' && newState.pendingSpawn && !newState.isACopy) {
        this._spawnCopy(container, newState);
        newState.pendingSpawn = false; // reset after handling
      }

      this._entityStates.set(container, newState);
    }
  };

  /**
   * Spawn a copy of a spreading entity near its current position.
   * Copies have isACopy = true so they never spawn further copies.
   */
  private _spawnCopy(parentContainer: Container, parentState: SpreadingState): void {
    const texture = this._entityTextures.get(parentContainer);
    const profile = this._entityProfiles.get(parentContainer);
    if (!texture || !profile) return;

    // Spawn near parent within spawnRadius
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * parentState.spawnRadius;
    const copyX = parentState.x + Math.cos(angle) * dist;
    const copyY = parentState.y + Math.sin(angle) * dist;

    // Build a copy using existing buildEntityContainer
    const {
      entity: copyContainer,
      label: copyLabel,
      spriteHeight: copySpriteH,
    } = buildEntityContainer(texture, profile, this._app);
    copyContainer.x = copyX;
    copyContainer.y = copyY;
    copyLabel.x = copyX;
    copyLabel.y = copyY - copySpriteH / 2 - 6;

    // Initialize state as a copy (isACopy = true, so it never spawns further)
    const copyState = initEntityState(profile.archetype, profile.speed, copyX, copyY);
    if (copyState.archetype === 'spreading') {
      (copyState as SpreadingState).isACopy = true;
    }

    this._worldRoot.addChild(copyContainer);
    this._worldRoot.addChild(copyLabel);
    this._entityStates.set(copyContainer, copyState);
    this._entityTextures.set(copyContainer, texture);
    this._entityProfiles.set(copyContainer, profile);
    this._entityLabels.set(copyContainer, copyLabel);
    this._entitySpriteHeights.set(copyContainer, copySpriteH);
    this._entityHp.set(copyContainer, 1);
  }

  // ─── Interaction helpers ──────────────────────────────────────────────────

  /**
   * Build a stable name→ID map for all unique entity profiles currently in the world.
   * Called after the interaction matrix is fetched so IDs match what AI assigned.
   */
  private _buildNameIdMap(profiles: EntityProfile[]): void {
    const seen = new Set<string>();
    const unique: EntityProfile[] = [];
    for (const p of profiles) {
      if (!seen.has(p.name)) { seen.add(p.name); unique.push(p); }
    }
    this._nameIdMap.clear();
    unique.forEach((p, i) => this._nameIdMap.set(p.name, String(i)));
  }

  /**
   * Resolve a fight contact between attacker and target.
   * Reduces target HP by 1; if HP reaches 0, removes target.
   * Applies a cooldown per attacker-target pair to prevent instant multi-hits.
   */
  private _handleFightContact(attackerContainer: Container, targetContainer: Container): void {
    const attackerProfile = this._entityProfiles.get(attackerContainer);
    const targetProfile = this._entityProfiles.get(targetContainer);
    if (!attackerProfile || !targetProfile) return;

    const attackerId = this._nameIdMap.get(attackerProfile.name);
    const targetId = this._nameIdMap.get(targetProfile.name);
    if (!attackerId || !targetId) return;

    const cooldownKey = `${attackerId}:${targetId}`;
    if (this._fightCooldowns.has(cooldownKey)) return; // on cooldown

    const currentHp = this._entityHp.get(targetContainer) ?? 1;
    const newHp = currentHp - 1;
    this._entityHp.set(targetContainer, newHp);

    if (newHp <= 0) {
      this.removeEntity(targetContainer);
    }

    this._fightCooldowns.set(cooldownKey, FIGHT_COOLDOWN_MS);
  }

  // ─── Round lifecycle ──────────────────────────────────────────────────────

  /**
   * Start a new round: analyze entities, then simulate for 30 seconds.
   *
   * Guards:
   * - Does nothing if a round is already in progress (idle guard).
   * - Does nothing if there are no entities to interact.
   *
   * Phase flow: idle → analyzing → simulating → (auto-end after 30s) → idle
   */
  async startRound(): Promise<void> {
    if (this._roundPhase !== 'idle') return;
    if (this._entityStates.size === 0) return;

    this._roundPhase = 'analyzing';
    this._onRoundPhaseChange?.(this._roundPhase);
    this._roundOverlay.showAnalyzingSpinner();

    const profiles = Array.from(this._entityProfiles.values());
    try {
      const matrix = await fetchInteractions(profiles);
      this._interactionMatrix = matrix;
      this._buildNameIdMap(profiles);
      this._fightCooldowns.clear();
    } catch (err) {
      console.warn('[WorldStage] fetchInteractions failed, using empty fallback:', err);
      this._interactionMatrix = { entries: [] };
      this._buildNameIdMap(profiles);
      this._fightCooldowns.clear();
    }

    this._roundOverlay.hideAnalyzingSpinner();
    this._roundPhase = 'simulating';
    this._onRoundPhaseChange?.(this._roundPhase);
    this._roundOverlay.startCountdown(30);
    this._roundTimer = window.setTimeout(() => this._endRound(), 30_000);
  }

  /**
   * End the current round: clear timer, stop countdown, transition to idle.
   * Surviving entities remain in all maps — they are NOT removed at round end.
   * Called automatically after 30s, or manually (e.g. from a UI button).
   */
  private _endRound(): void {
    if (this._roundTimer !== null) {
      clearTimeout(this._roundTimer);
      this._roundTimer = null;
    }
    this._roundOverlay.stopCountdown();
    this._interactionMatrix = null;
    this._nameIdMap.clear();
    this._fightCooldowns.clear();
    this._roundPhase = 'idle';
    this._onRoundPhaseChange?.(this._roundPhase);
  }

  // ─── Entity removal ───────────────────────────────────────────────────────

  /**
   * Fade out an entity over 0.5s then remove it from all 5 maps, destroy label
   * and container GPU resources.
   *
   * Idempotent: calling removeEntity() on a container that is already dying is
   * a no-op.
   *
   * Public so Phase 8 fight resolution can call it directly.
   *
   * @param container - The entity's root Container (used as map key)
   */
  removeEntity(container: Container): void {
    if (this._dyingEntities.has(container)) return; // already dying
    this._dyingEntities.add(container);

    const label = this._entityLabels.get(container);
    const fadeDuration = 500; // 0.5s
    let elapsed = 0;

    const fadeOut = (ticker: Ticker): void => {
      elapsed += ticker.deltaMS;
      const alpha = Math.max(0, 1 - elapsed / fadeDuration);
      container.alpha = alpha;
      if (label) label.alpha = alpha;

      if (alpha <= 0) {
        this._app.ticker.remove(fadeOut);

        // Delete from all maps BEFORE destroy() to prevent leaked texture references
        this._entityStates.delete(container);
        this._entityTextures.delete(container);
        this._entityProfiles.delete(container);
        this._entityLabels.delete(container);
        this._entitySpriteHeights.delete(container);
        this._entityHp.delete(container);
        this._dyingEntities.delete(container);

        label?.destroy({ children: true });
        container.destroy({ children: true });
      }
    };

    this._app.ticker.add(fadeOut);
  }
}
