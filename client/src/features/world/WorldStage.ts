import { Application, Container, Graphics, Ticker, Texture } from 'pixi.js';
import { EntityProfile, InteractionMatrix } from '@crayon-world/shared/src/types';
import { captureEntityTexture } from './captureEntityTexture';
import { buildEntityContainer, buildEntitySprite } from './EntitySprite';
import { EntityState, SpreadingState, initEntityState, dispatchBehavior, WORLD_BOUNDS } from '@crayon-world/shared/src/simulation/EntitySimulation';
import { fetchInteractions } from './fetchInteractions';
import { RoundOverlay, RoundOutcome } from './RoundOverlay';
import { resolveInteraction, applyInteractionSteering, DETECTION_RANGE_FRACTION, FIGHT_PROXIMITY_FRACTION, FIGHT_COOLDOWN_MS } from '@crayon-world/shared/src/simulation/interactionBehaviors';

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
  private _bounceCooldowns = new Map<Container, number>(); // ms remaining after wall bounce
  private _interactionMatrix: InteractionMatrix | null = null;
  private _roundTimer: number | null = null;
  private readonly _roundOverlay: RoundOverlay;
  private _onRoundPhaseChange: ((phase: RoundPhase) => void) | null = null;

  // Round outcome tracking
  private _roundNumber = 0;
  private _namesAtRoundStart = new Set<string>();
  private _lastOutcome: RoundOutcome | null = null;

  // Simulation state maps — keyed by entity container
  private readonly _entityStates = new Map<Container, EntityState>();
  private readonly _entityTextures = new Map<Container, Texture>();
  private readonly _entityProfiles = new Map<Container, EntityProfile>();
  private readonly _entityLabels = new Map<Container, Container>();
  private readonly _entitySpriteHeights = new Map<Container, number>();
  private readonly _entityHp = new Map<Container, number>();
  private readonly _nameIdMap = new Map<string, string>();
  private readonly _fightCooldowns = new Map<string, number>();
  // Active lunge animations — visual-only forward-and-back offset on the attacker
  // container applied each tick after positions are set.
  private readonly _lungeAnimations = new Map<
    Container,
    { elapsed: number; duration: number; dirX: number; dirY: number; amp: number }
  >();

  // Multiplayer — UUID-keyed container maps for Schema-driven rendering
  private readonly _entityContainersById = new Map<string, Container>();
  private readonly _entityIdByContainer = new Map<Container, string>();
  private _multiplayerMode = false;

  // Interpolation — two snapshots of server state for lerping between ticks
  private _prevSnapshot = new Map<string, { x: number; y: number; vx: number; vy: number; hp: number }>();
  private _currSnapshot = new Map<string, { x: number; y: number; vx: number; vy: number; hp: number }>();
  private _snapshotTime = 0; // timestamp when _currSnapshot arrived
  private _prevSnapshotTime = 0; // timestamp when _prevSnapshot arrived
  private static readonly SERVER_TICK_MS = 50; // server sends state every 50ms

  // Drawing texture for the local player's submitted entity
  private _capturedDrawingTexture: Texture | null = null;
  private _mySessionId = '';

  constructor(app: Application) {
    this._app = app;
    this._drawingRoot = new Container();
    this._worldRoot = new Container();
    this._roundOverlay = new RoundOverlay();

    app.stage.addChild(this._drawingRoot);
    app.stage.addChild(this._worldRoot);

    // White play-area fill — everything outside WORLD_BOUNDS stays on the blue
    // canvas background, making the gutters visually distinct from the play area.
    const playArea = new Graphics();
    playArea.rect(0, 0, WORLD_BOUNDS.width, WORLD_BOUNDS.height).fill({ color: 0xffffff });
    playArea.eventMode = 'none';
    this._worldRoot.addChild(playArea);

    // Start in draw mode — world is hidden
    this._worldRoot.visible = false;

    // Fit the sim area uniformly into the canvas and keep it fitted on resize.
    // Uniform scale preserves aspect ratio so circles stay circles across clients;
    // gutters on one axis are left transparent.
    //
    // We listen to the renderer's own `resize` event — not `window.resize` —
    // because Pixi's resizeTo:window updates `app.screen` during its own resize
    // handler, and window.resize fires too early to read the new dimensions.
    this._fitWorldToScreen();
    this._onRendererResize = () => this._fitWorldToScreen();
    app.renderer.on('resize', this._onRendererResize);

    // Register single shared ticker for all entity simulation
    app.ticker.add(this._gameTick);
  }

  private _onRendererResize: (() => void) | null = null;

  /**
   * Scale and center worldRoot so WORLD_BOUNDS fits uniformly inside the canvas.
   * Called once in the constructor and on every renderer resize.
   */
  private _fitWorldToScreen(): void {
    const screen = this._app.screen;
    const scale = Math.min(screen.width / WORLD_BOUNDS.width, screen.height / WORLD_BOUNDS.height);
    this._worldRoot.scale.set(scale);
    this._worldRoot.x = (screen.width - WORLD_BOUNDS.width * scale) / 2;
    this._worldRoot.y = (screen.height - WORLD_BOUNDS.height * scale) / 2;
  }

  /** Dispose listeners and tickers. Call from cleanupPixi. */
  destroy(): void {
    if (this._onRendererResize) {
      this._app.renderer.off('resize', this._onRendererResize);
      this._onRendererResize = null;
    }
    this._app.ticker.remove(this._gameTick);
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

  /** Outcome data from the most recently completed round; null before first round. */
  get lastOutcome(): RoundOutcome | null {
    return this._lastOutcome;
  }

  /**
   * Show the round outcome card using the most recent outcome data.
   * Delegates to the internal RoundOverlay instance.
   *
   * @param onDismiss - Callback fired when the player clicks to dismiss the card
   */
  showRoundOutcome(onDismiss: () => void): void {
    if (!this._lastOutcome) return;
    this._roundOverlay.showOutcome(this._lastOutcome, onDismiss);
  }

  /** Register a callback invoked whenever the round phase changes. */
  set onRoundPhaseChange(cb: ((phase: RoundPhase) => void) | null) {
    this._onRoundPhaseChange = cb;
  }

  /**
   * Enable or disable multiplayer render-only mode.
   * When true, _gameTick is a no-op and entity positions come from Schema patches
   * via applyPositions() called by MultiplayerWorldBridge.
   */
  set multiplayerMode(enabled: boolean) {
    this._multiplayerMode = enabled;
  }

  /** Store the local player's captured drawing texture for use when their entity spawns. */
  set capturedDrawingTexture(t: Texture | null) {
    this._capturedDrawingTexture = t;
  }

  /** Get the local player's captured drawing texture. */
  get capturedDrawingTexture(): Texture | null {
    return this._capturedDrawingTexture;
  }

  /** Set the local player's session ID to identify which spawned entity belongs to them. */
  set mySessionId(id: string) {
    this._mySessionId = id;
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
    const state = initEntityState(profile, entity.x, entity.y);
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
    // In multiplayer mode, interpolate between server snapshots for smooth rendering
    if (this._multiplayerMode) {
      this._interpolateMultiplayer();
      this._applyLunges(ticker.deltaMS);
      return;
    }

    // Freeze all entities when not in simulation phase (idle or analyzing)
    if (this._roundPhase !== 'simulating') return;

    const dt = ticker.deltaMS / 1000;
    const world = { width: this._app.screen.width, height: this._app.screen.height };
    const worldDiag = Math.sqrt(world.width * world.width + world.height * world.height);
    const detectionRange = worldDiag * DETECTION_RANGE_FRACTION;
    const fightProximity = worldDiag * FIGHT_PROXIMITY_FRACTION;

    // Decrement cooldowns
    for (const [key, remaining] of this._fightCooldowns) {
      const next = remaining - ticker.deltaMS;
      if (next <= 0) this._fightCooldowns.delete(key);
      else this._fightCooldowns.set(key, next);
    }
    for (const [container, remaining] of this._bounceCooldowns) {
      const next = remaining - ticker.deltaMS;
      if (next <= 0) this._bounceCooldowns.delete(container);
      else this._bounceCooldowns.set(container, next);
    }

    for (const [container, state] of this._entityStates) {
      // Skip dying entities — they are handled by their own fade-out ticker callback
      if (this._dyingEntities.has(container)) continue;

      const isMovable = state.archetype !== 'rooted' && state.archetype !== 'stationary';
      const isBouncing = this._bounceCooldowns.has(container);

      // During bounce cooldown, use archetype behavior (which respects the bounced velocity)
      // instead of interaction steering (which would override it and push back into the wall)
      const resolved = (this._interactionMatrix && isMovable && !isBouncing)
        ? resolveInteraction(
            container,
            this._entityStates,
            this._entityProfiles,
            this._dyingEntities,
            this._interactionMatrix,
            this._nameIdMap,
            detectionRange,
          )
        : null;

      let newState: EntityState;

      if (resolved) {
        const targetState = this._entityStates.get(resolved.targetContainer);
        if (targetState) {
          newState = applyInteractionSteering(state, resolved, targetState, dt, worldDiag);

          // Fight contact check — 'chase' means predator caught prey; 'fight' means hostile contact
          if ((resolved.type === 'fight' || resolved.type === 'chase') && resolved.distance < fightProximity) {
            this._handleFightContact(container, resolved.targetContainer);
          }
        } else {
          newState = dispatchBehavior(state, dt, world);
        }
      } else {
        newState = dispatchBehavior(state, dt, world);
      }

      // Bounce off screen edges — account for sprite half-size so edges touch border
      const entitySize = this._entitySpriteHeights.get(container) ?? 0;
      const halfW = entitySize * 0.5;
      const halfH = entitySize * 0.5;
      const minX = halfW;
      const maxX = world.width - halfW;
      const minY = halfH;
      const maxY = world.height - halfH;
      let bounced = false;

      if (newState.x < minX) {
        newState.x = minX;
        if ('vx' in newState) (newState as { vx: number }).vx *= -1;
        bounced = true;
      } else if (newState.x > maxX) {
        newState.x = maxX;
        if ('vx' in newState) (newState as { vx: number }).vx *= -1;
        bounced = true;
      }
      if (newState.y < minY) {
        newState.y = minY;
        if ('vy' in newState) (newState as { vy: number }).vy *= -1;
        bounced = true;
      } else if (newState.y > maxY) {
        newState.y = maxY;
        if ('vy' in newState) (newState as { vy: number }).vy *= -1;
        bounced = true;
      }

      // After a bounce, suppress interaction steering briefly so the entity
      // travels away from the wall before flee/chase can redirect it back
      if (bounced) {
        this._bounceCooldowns.set(container, 500); // 0.5s cooldown
      }

      // Write position to container
      container.x = newState.x;
      container.y = newState.y;

      // Orientation for walking and flying — feet always face down.
      // Horizontal flip for left/right, tilt up to ±45° for vertical movement.
      if (newState.archetype === 'walking' || newState.archetype === 'flying') {
        // Flip hysteresis: only change scale sign when horizontal motion is
        // clearly dominant. Avoids sprite flicker when vx jitters near zero
        // (e.g., target directly above/below, or micro-noise in steering).
        const absVx = Math.abs(newState.vx);
        const absVy = Math.abs(newState.vy);
        if (absVx > 5 && absVx > absVy * 0.4) {
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

    this._applyLunges(ticker.deltaMS);
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
    const copyState = initEntityState(profile, copyX, copyY);
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

    // Visual: attacker lunges toward target and returns.
    this._triggerLunge(attackerContainer, targetContainer);
  }

  /**
   * Start a lunge animation on `attacker` directed at `target`. Plays even if
   * one is already active — the new lunge overwrites it so rapid attacks stay
   * visible. Safe no-op if the two containers are coincident.
   */
  private _triggerLunge(attacker: Container, target: Container): void {
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) return;

    const spriteH = this._entitySpriteHeights.get(attacker) ?? 60;
    const amp = Math.min(spriteH * 0.5, dist * 0.6);

    this._lungeAnimations.set(attacker, {
      elapsed: 0,
      duration: 220,
      dirX: dx / dist,
      dirY: dy / dist,
      amp,
    });
  }

  /**
   * Trigger a lunge by entity ID (multiplayer path — server broadcasts an
   * `attack` message with attacker/target IDs).
   */
  triggerAttackLungeById(attackerId: string, targetId: string): void {
    const attacker = this._entityContainersById.get(attackerId);
    const target = this._entityContainersById.get(targetId);
    if (!attacker || !target) return;
    this._triggerLunge(attacker, target);
  }

  /**
   * Advance all active lunges by deltaMS and add their current offset to the
   * attacker's container position. Called every tick AFTER positions are set,
   * so the offset is purely visual and doesn't feed back into simulation.
   */
  private _applyLunges(deltaMS: number): void {
    if (this._lungeAnimations.size === 0) return;
    for (const [container, lunge] of this._lungeAnimations) {
      lunge.elapsed += deltaMS;
      const t = lunge.elapsed / lunge.duration;
      if (t >= 1) {
        this._lungeAnimations.delete(container);
        continue;
      }
      // sin(π·t) peaks at t=0.5 then returns to 0 — forward-and-back.
      const f = Math.sin(Math.PI * t);
      const ox = lunge.dirX * lunge.amp * f;
      const oy = lunge.dirY * lunge.amp * f;
      container.x += ox;
      container.y += oy;
      const label = this._entityLabels.get(container);
      if (label) {
        label.x += ox;
        label.y += oy;
      }
    }
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

    // Increment round number and snapshot entity names BEFORE async work (avoid off-by-one)
    this._roundNumber += 1;
    this._namesAtRoundStart = new Set(Array.from(this._entityProfiles.values()).map(p => p.name));

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

    console.log('[WorldStage] Interaction matrix:', JSON.stringify(this._interactionMatrix, null, 2));
    console.log('[WorldStage] Name-ID map:', Object.fromEntries(this._nameIdMap));
    console.log('[WorldStage] Entity profiles:', profiles.map(p => p.name));

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

    // Compute outcome BEFORE transitioning to idle so lastOutcome is populated
    // when the phase-change callback fires and main.ts reads it.
    const namesNow = new Set(Array.from(this._entityProfiles.values()).map(p => p.name));
    this._lastOutcome = {
      roundNumber: this._roundNumber,
      survivors: [...namesNow],
      removed: [...this._namesAtRoundStart].filter(n => !namesNow.has(n)),
    };

    this._roundPhase = 'idle';
    this._onRoundPhaseChange?.(this._roundPhase);
  }

  // ─── Multiplayer render-only API ─────────────────────────────────────────

  /**
   * Spawn an entity driven by a server Schema record.
   * Uses a 1x1 white placeholder texture unless an explicit texture is provided.
   * Stores the container in UUID-keyed maps so applyPositions/removeEntityById can look it up.
   *
   * Does NOT initialize EntityState — server owns simulation.
   *
   * @param entityId - UUID from server Schema
   * @param profile - Entity profile from recognition
   * @param x - Initial x position in world pixels
   * @param y - Initial y position in world pixels
   * @param teamId - Optional team identifier for color tinting ('red' | 'blue')
   * @param texture - Optional explicit texture; falls back to Texture.WHITE placeholder
   */
  spawnFromSchema(
    entityId: string,
    profile: EntityProfile,
    x: number,
    y: number,
    teamId?: string,
    texture?: Texture,
  ): void {
    // Use provided texture or 1x1 white placeholder
    const tex = texture ?? Texture.WHITE;
    const { entity, label, spriteHeight } = buildEntityContainer(tex, profile, this._app, teamId);

    entity.x = x;
    entity.y = y;
    label.x = x;
    label.y = y - spriteHeight / 2 - 6;

    this._worldRoot.addChild(entity);
    this._worldRoot.addChild(label);

    // Store in Container-keyed maps (shared infrastructure)
    this._entityLabels.set(entity, label);
    this._entitySpriteHeights.set(entity, spriteHeight);
    this._entityHp.set(entity, 1);
    this._entityProfiles.set(entity, profile);

    // Store in UUID-keyed maps (multiplayer lookup)
    this._entityContainersById.set(entityId, entity);
    this._entityIdByContainer.set(entity, entityId);
  }

  /**
   * Update an already-spawned entity's sprite texture (e.g., when texture arrives after spawn).
   *
   * The entity may have been built with Texture.WHITE as a placeholder, whose tiny
   * dimensions produce the wrong finalScale. Simply swapping `sprite.texture` leaves
   * the placeholder-derived scale in place and renders the real drawing at hundreds
   * of px — effectively off-screen. Instead, destroy the old sprite entirely and
   * rebuild via the same helper used at spawn time so scale, filters, and anchor
   * are guaranteed to match the happy path.
   */
  updateEntityTexture(entityId: string, texture: Texture): void {
    const container = this._entityContainersById.get(entityId);
    if (!container) return;

    const oldSprite = container.children[0];
    if (oldSprite) {
      container.removeChild(oldSprite);
      oldSprite.destroy();
    }

    const sprite = buildEntitySprite(texture);
    container.addChildAt(sprite, 0);

    // Sync sprite height so label positioning (_interpolateMultiplayer) stays correct
    this._entitySpriteHeights.set(container, sprite.height);
  }

  /**
   * Apply position/velocity/hp updates from server Schema patches to PixiJS containers.
   * Called each time room.onStateChange fires with the full entity snapshot.
   *
   * For each entity: updates x/y, applies sprite orientation from vx/vy,
   * syncs label position. If hp <= 0 and entity is not already dying, calls removeEntity.
   */
  applyPositions(
    entities: Map<string, { x: number; y: number; vx: number; vy: number; hp: number }>,
  ): void {
    // Handle deaths immediately (no interpolation delay for removal)
    for (const [entityId, data] of entities) {
      if (data.hp <= 0) {
        const container = this._entityContainersById.get(entityId);
        if (container && !this._dyingEntities.has(container)) {
          this.removeEntity(container);
        }
      }
    }

    // Shift current snapshot to previous, store new snapshot
    this._prevSnapshot = this._currSnapshot;
    this._prevSnapshotTime = this._snapshotTime;
    this._currSnapshot = new Map(entities);
    this._snapshotTime = performance.now();

    // For entities appearing for the first time, snap them to position immediately
    // (no previous snapshot to interpolate from)
    for (const [entityId, data] of entities) {
      if (!this._prevSnapshot.has(entityId)) {
        const container = this._entityContainersById.get(entityId);
        if (container && !this._dyingEntities.has(container)) {
          container.x = data.x;
          container.y = data.y;
          this._applyOrientation(entityId, data);
        }
      }
    }
  }

  /**
   * Interpolate entity positions between previous and current server snapshots.
   * Called every frame from _gameTick in multiplayer mode.
   * Renders one tick behind so we always have two endpoints to lerp between.
   */
  private _interpolateMultiplayer(): void {
    if (this._prevSnapshotTime === 0) return; // need at least 2 snapshots

    const now = performance.now();
    const tickDuration = this._snapshotTime - this._prevSnapshotTime;
    if (tickDuration <= 0) return;

    // t=0 when curr snapshot just arrived, t=1 one tick later (when next arrives)
    // This renders one tick behind: we lerp prev→curr over the duration between them
    const elapsed = now - this._snapshotTime;
    const t = Math.min(Math.max(elapsed / tickDuration, 0), 1);

    for (const [entityId, curr] of this._currSnapshot) {
      const container = this._entityContainersById.get(entityId);
      if (!container || this._dyingEntities.has(container)) continue;

      const prev = this._prevSnapshot.get(entityId);
      if (!prev) continue; // new entity, already snapped in applyPositions

      // Lerp position
      container.x = prev.x + (curr.x - prev.x) * t;
      container.y = prev.y + (curr.y - prev.y) * t;

      // Orientation uses the current server snapshot directly, NOT the interpolated
      // velocity. When vx flips sign between ticks (e.g. wall bounce), the lerped
      // value sweeps through zero over 50ms — and every frame on each side of zero
      // would re-flip the sprite, causing visible flicker. curr.vx changes once
      // per server tick, so the sprite flips exactly when direction actually changes.
      this._applyOrientation(entityId, { vx: curr.vx, vy: curr.vy });

      // Sync label position
      const label = this._entityLabels.get(container);
      const spriteH = this._entitySpriteHeights.get(container);
      if (label && spriteH !== undefined) {
        label.x = container.x;
        label.y = container.y - spriteH / 2 - 6;
      }
    }
  }

  /**
   * Apply sprite orientation (horizontal flip + tilt) from velocity data.
   */
  private _applyOrientation(
    entityId: string,
    data: { vx: number; vy: number },
  ): void {
    const container = this._entityContainersById.get(entityId);
    if (!container) return;

    const profile = this._entityProfiles.get(container);
    const archetype = profile?.archetype;
    if (archetype === 'walking' || archetype === 'flying') {
      const absVx = Math.abs(data.vx);
      const absVy = Math.abs(data.vy);
      if (absVx > 5 && absVx > absVy * 0.4) {
        container.scale.x =
          data.vx < 0 ? -Math.abs(container.scale.x) : Math.abs(container.scale.x);
      }
      const speed = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
      if (speed > 0.01) {
        const tilt = Math.asin(Math.max(-1, Math.min(1, data.vy / speed)));
        const maxTilt = Math.PI / 4;
        container.rotation = Math.max(-maxTilt, Math.min(maxTilt, tilt));
      }
    }
  }

  /**
   * Remove an entity by UUID (used when server removes it from Schema).
   * Delegates to removeEntity() for fade-out animation.
   * Also cleans UUID-keyed maps when the fade completes.
   */
  removeEntityById(entityId: string): void {
    const container = this._entityContainersById.get(entityId);
    if (!container) return;
    this.removeEntity(container);
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

        // Clean UUID-keyed maps (multiplayer mode)
        const entityId = this._entityIdByContainer.get(container);
        if (entityId !== undefined) {
          this._entityContainersById.delete(entityId);
        }
        this._entityIdByContainer.delete(container);

        label?.destroy({ children: true });
        container.destroy({ children: true });
      }
    };

    this._app.ticker.add(fadeOut);
  }
}
