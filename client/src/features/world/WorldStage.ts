import { Application, Assets, Container, Graphics, Sprite, Text, Ticker, Texture } from 'pixi.js';
import { EntityProfile, InteractionMatrix, MapType } from '@crayon-world/shared/src/types';
import { captureEntityTexture } from './captureEntityTexture';
import { buildEntityContainer, buildEntitySprite, updateHealthBar } from './EntitySprite';
import { EntityState, initEntityState, dispatchBehavior, WORLD_BOUNDS } from '@crayon-world/shared/src/simulation/EntitySimulation';
import { fetchInteractions } from './fetchInteractions';
import { RoundOverlay, RoundOutcome } from './RoundOverlay';
import { resolveInteraction, blendSteeringIntoAnimation, DETECTION_RANGE_FRACTION, FIGHT_PROXIMITY_FRACTION, FIGHT_COOLDOWN_MS, BEFRIEND_STOP_FRACTION, ResolvedInteraction } from '@crayon-world/shared/src/simulation/interactionBehaviors';
import landMap from './assets/maps/land.webp';
import waterMap from './assets/maps/water.webp';
import skyMap from './assets/maps/sky.webp';

const MAP_TEXTURE_URLS: Record<MapType, string> = {
  land: landMap,
  water: waterMap,
  sky: skyMap,
};

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
  private _playArea!: Sprite;
  private _mapType: MapType = 'land';

  // Round state machine
  private _roundPhase: RoundPhase = 'idle';
  private _dyingEntities = new Set<Container>();
  // Land-map deaths leave a frozen corpse instead of destroying — wiped on round restart.
  private _deadInPlace = new Set<Container>();
  // Non-fliers spawned on a sky map start the fall animation immediately —
  // when the server later removes them (HP snaps to 0 after ~1s) we skip the
  // normal removeEntity animation since they're already invisible.
  private _fallingFromSpawn = new Set<Container>();
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
  private readonly _entityMaxHp = new Map<Container, number>();
  private readonly _entityHealthBars = new Map<Container, Graphics>();
  private readonly _nameIdMap = new Map<string, string>();
  private readonly _fightCooldowns = new Map<string, number>();
  // Active lunge animations — visual-only forward-and-back offset on the attacker
  // container applied each tick after positions are set.
  private readonly _lungeAnimations = new Map<
    Container,
    { elapsed: number; duration: number; dirX: number; dirY: number; amp: number }
  >();
  // Companion tracking — befriended entities that have reached each other
  // Maps each entity to its set of companions (supports groups, not just pairs)
  private readonly _companions = new Map<Container, Set<Container>>();

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

    // Map background sprite — texture swaps with map type via setMapType().
    this._playArea = new Sprite();
    this._playArea.eventMode = 'none';
    this._worldRoot.addChild(this._playArea);
    this._redrawPlayArea();

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
    return this._entityStates.size - this._deadInPlace.size;
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

  /** Update the current map type — retints the play area background. */
  setMapType(map: MapType): void {
    if (this._mapType === map) return;
    this._mapType = map;
    this._redrawPlayArea();
  }

  private _redrawPlayArea(): void {
    const requested = this._mapType;
    void Assets.load<Texture>(MAP_TEXTURE_URLS[requested]).then((texture) => {
      if (this._mapType !== requested) return;
      this._playArea.texture = texture;
      this._playArea.width = WORLD_BOUNDS.width;
      this._playArea.height = WORLD_BOUNDS.height;
    });
  }

  /** Toggle between draw mode and world mode. */
  toggle(): void {
    this.setMode(this._inWorld ? 'draw' : 'world');
  }

  /**
   * Explicitly set draw vs. world mode. Idempotent — safe to call when already
   * in the requested mode. Prefer this over toggle() at phase transitions so a
   * desynced inWorld flag can't leave the wrong root visible.
   */
  setMode(mode: 'draw' | 'world'): void {
    this._inWorld = mode === 'world';
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
    const { entity, label, spriteHeight, healthBar } = buildEntityContainer(texture, profile, app);

    // Position randomly within canvas with 50px margin from edges
    const margin = 50;
    entity.x = margin + Math.random() * (app.screen.width - margin * 2);
    entity.y = margin + Math.random() * (app.screen.height - margin * 2);

    // Label is a sibling — not affected by entity rotation/flip
    label.x = entity.x;
    label.y = entity.y - spriteHeight / 2 - 6;

    this._worldRoot.addChild(entity);
    this._worldRoot.addChild(label);

    // Initialize simulation state for this entity. Single-player path uses
    // the creature's home-habitat speed as its effective speed.
    const homeSpeed =
      profile.habitat === 'land' ? profile.landSpeed
      : profile.habitat === 'water' ? profile.waterSpeed
      : profile.airSpeed;
    const state = initEntityState(
      {
        archetype: profile.archetype,
        movementStyle: profile.movementStyle,
        speed: homeSpeed ?? 5,
        agility: profile.agility,
        energy: profile.energy,
      },
      entity.x,
      entity.y,
    );
    this._entityStates.set(entity, state);
    this._entityTextures.set(entity, texture);
    this._entityProfiles.set(entity, profile);
    this._entityLabels.set(entity, label);
    this._entitySpriteHeights.set(entity, spriteHeight);
    this._entityHp.set(entity, 1);
    this._entityMaxHp.set(entity, 1);
    this._entityHealthBars.set(entity, healthBar);
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

    const companionRadius = worldDiag * BEFRIEND_STOP_FRACTION;
    const companionCohesion = 0.3; // blend factor for cohesion steering

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

      // Check if this entity has companions (group support)
      const companionSet = this._companions.get(container);
      const hasCompanions = companionSet && companionSet.size > 0;

      // Check if any companion has a hostile interaction we should respond to
      let companionResolved: ResolvedInteraction<Container> | null = null;
      if (hasCompanions && this._interactionMatrix && isMovable && !isBouncing) {
        for (const comp of companionSet) {
          if (this._dyingEntities.has(comp)) continue;
          const companionInteraction = resolveInteraction(
            comp,
            this._entityStates,
            this._entityProfiles,
            this._dyingEntities,
            this._interactionMatrix,
            this._nameIdMap,
            detectionRange,
          );
          // Only inherit hostile interactions (chase, flee, fight), not befriend
          if (companionInteraction && companionInteraction.type !== 'befriend' && companionInteraction.type !== 'ignore') {
            companionResolved = companionInteraction;
            break; // Use first hostile interaction found
          }
        }
      }

      // Determine effective interaction: prioritize own hostile > companion hostile > own befriend
      const ownIsHostile = resolved && resolved.type !== 'befriend' && resolved.type !== 'ignore';
      const effectiveResolved = ownIsHostile ? resolved : (companionResolved ?? resolved);

      if (resolved && resolved.type === 'befriend') {
        const targetState = this._entityStates.get(resolved.targetContainer);

        if (targetState) {
          // Track as companions once close enough (bidirectional)
          if (resolved.distance <= companionRadius) {
            // Add target to our companions
            let myCompanions = this._companions.get(container);
            if (!myCompanions) {
              myCompanions = new Set();
              this._companions.set(container, myCompanions);
            }
            myCompanions.add(resolved.targetContainer);

            // Add us to target's companions (bidirectional)
            let theirCompanions = this._companions.get(resolved.targetContainer);
            if (!theirCompanions) {
              theirCompanions = new Set();
              this._companions.set(resolved.targetContainer, theirCompanions);
            }
            theirCompanions.add(container);
          }

          // If close enough (companion mode) and no hostile interaction, use archetype behavior + cohesion
          // Use distance directly, not set membership, to avoid one-frame delay
          const inCompanionMode = resolved.distance <= companionRadius;

          if (inCompanionMode && !companionResolved) {
            // Run archetype behavior for natural movement
            const archetypeState = dispatchBehavior(state, dt, world);

            // Add cohesion force toward companion (use target position directly)
            if ('vx' in archetypeState && 'vy' in archetypeState) {
              const archetypeVx = (archetypeState as { vx: number }).vx;
              const archetypeVy = (archetypeState as { vy: number }).vy;
              const archetypeSpeed = Math.sqrt(archetypeVx * archetypeVx + archetypeVy * archetypeVy);
              const isPausing = archetypeSpeed < 1;

              // If archetype is pausing, respect that - don't apply cohesion
              if (isPausing) {
                newState = archetypeState;
              } else {
                const dx = targetState.x - archetypeState.x;
                const dy = targetState.y - archetypeState.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Only apply cohesion if drifting apart
                if (dist > companionRadius * 0.5) {
                  const speed = 'speed' in state ? (state as { speed: number }).speed : 80;
                  const cohesionStrength = Math.min(1, (dist - companionRadius * 0.5) / companionRadius);
                  const cohesionVx = dist > 1 ? (dx / dist) * speed * cohesionStrength * companionCohesion : 0;
                  const cohesionVy = dist > 1 ? (dy / dist) * speed * cohesionStrength * companionCohesion : 0;

                  newState = {
                    ...archetypeState,
                    x: archetypeState.x + cohesionVx * dt,
                    y: archetypeState.y + cohesionVy * dt,
                    vx: archetypeVx * (1 - companionCohesion) + cohesionVx,
                    vy: archetypeVy * (1 - companionCohesion) + cohesionVy,
                  } as EntityState;
                } else {
                  newState = archetypeState;
                }
              }
            } else {
              newState = archetypeState;
            }
          } else if (companionResolved) {
            // Companion has hostile interaction, respond together
            // Run archetype behavior first to preserve animations
            const archetypeState = dispatchBehavior(state, dt, world);
            const threatState = this._entityStates.get(companionResolved.targetContainer);
            if (threatState) {
              newState = blendSteeringIntoAnimation(archetypeState, companionResolved, threatState, worldDiag);
            } else {
              newState = archetypeState;
            }
          } else {
            // Still approaching companion — run archetype behavior and blend in steering
            const archetypeState = dispatchBehavior(state, dt, world);
            newState = blendSteeringIntoAnimation(archetypeState, resolved, targetState, worldDiag, 0.8);
          }
        } else {
          newState = dispatchBehavior(state, dt, world);
        }
      } else if (effectiveResolved) {
        const targetState = this._entityStates.get(effectiveResolved.targetContainer);
        if (targetState) {
          // Run archetype behavior first to preserve animations (hopping, swooping, etc.)
          const archetypeState = dispatchBehavior(state, dt, world);
          // Then blend steering direction into the animated state
          newState = blendSteeringIntoAnimation(archetypeState, effectiveResolved, targetState, worldDiag);

          // Fight contact check — 'chase' means predator caught prey; 'fight' means hostile contact
          if ((effectiveResolved.type === 'fight' || effectiveResolved.type === 'chase') && effectiveResolved.distance < fightProximity) {
            this._handleFightContact(container, effectiveResolved.targetContainer);
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

      this._entityStates.set(container, newState);
    }

    this._applyLunges(ticker.deltaMS);
  };

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

    const maxHp = this._entityMaxHp.get(targetContainer) ?? 1;
    const bar = this._entityHealthBars.get(targetContainer);
    if (bar) updateHealthBar(bar, newHp / maxHp);

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
      // Defensive: an external destroy (cleanupOrphans on phase transition)
      // can leave orphaned lunge entries; skip + drop them.
      if (container.destroyed) {
        this._lungeAnimations.delete(container);
        continue;
      }
      lunge.elapsed += deltaMS;
      const t = lunge.elapsed / lunge.duration;
      if (t >= 1) {
        this._lungeAnimations.delete(container);
        continue;
      }
      // Skip dying containers: _interpolateMultiplayer doesn't reset their
      // base position each frame, so `+=` here would accumulate instead of
      // producing a pulse — launching the corpse across the screen.
      if (this._dyingEntities.has(container)) {
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

    // Wipe any frozen corpses left from the previous round before fresh action.
    this.clearCorpses();

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
    // Corpses (frozen dead-on-land entities) are not survivors.
    const namesNow = new Set(
      Array.from(this._entityProfiles.entries())
        .filter(([container]) => !this._deadInPlace.has(container))
        .map(([, p]) => p.name),
    );
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
    const { entity, label, spriteHeight, healthBar } = buildEntityContainer(tex, profile, this._app, teamId);

    entity.x = x;
    entity.y = y;
    label.x = x;
    label.y = y - spriteHeight / 2 - 6;

    this._worldRoot.addChild(entity);
    this._worldRoot.addChild(label);

    // Store in Container-keyed maps (shared infrastructure)
    this._entityLabels.set(entity, label);
    this._entitySpriteHeights.set(entity, spriteHeight);
    const maxHp = profile.maxHealth ?? 1;
    this._entityHp.set(entity, maxHp);
    this._entityMaxHp.set(entity, maxHp);
    this._entityHealthBars.set(entity, healthBar);
    this._entityProfiles.set(entity, profile);

    // Store in UUID-keyed maps (multiplayer lookup)
    this._entityContainersById.set(entityId, entity);
    this._entityIdByContainer.set(entity, entityId);

    // Non-fliers on a sky map can't survive — they fall the moment they spawn.
    // Server keeps HP full for ~1s then snaps it to 0; the spawn-time fall keeps
    // visuals in sync without waiting for the death notification.
    if (this._mapType === 'sky' && profile.archetype !== 'flying') {
      this._startFallFromSpawn(entity);
    }
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
      const container = this._entityContainersById.get(entityId);
      if (!container) continue;

      // Update health bar from server hp
      const bar = this._entityHealthBars.get(container);
      const maxHp = this._entityMaxHp.get(container) ?? 1;
      if (bar) updateHealthBar(bar, data.hp / maxHp);

      if (data.hp <= 0 && !this._dyingEntities.has(container)) {
        this.removeEntity(container);
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
   * Remove an entity by UUID, applying the appropriate death animation for the
   * current map type. Used when an entity dies mid-round.
   */
  removeEntityById(entityId: string): void {
    const container = this._entityContainersById.get(entityId);
    if (!container) return;
    this.removeEntity(container);
  }

  /**
   * Immediately destroy an entity by UUID with no animation. Used at round
   * end when the server clears the schema — survivors should be wiped, not
   * death-animated.
   */
  cleanupEntityById(entityId: string): void {
    const container = this._entityContainersById.get(entityId);
    if (!container) return;
    this._destroyEntity(container);
  }

  // ─── Entity removal ───────────────────────────────────────────────────────

  /**
   * Handle an entity's death.
   *
   * - Land map: leave a frozen corpse with empty HP bar and "(Dead)" label;
   *   destruction is deferred until clearCorpses() / cleanupAllEntities() runs.
   * - Sky map: scale-and-fall animation, then destroy.
   * - Water map: slow scale-and-fade ("sinking"), then destroy.
   *
   * Spawn-fall optimization: non-fliers spawned on sky maps already started
   * their fall animation in spawnFromSchema and are at scale ~0 by the time
   * the server snaps HP to 0 — skip the redundant animation, destroy directly.
   *
   * Idempotent: calling removeEntity() on a container that is already dying is
   * a no-op.
   *
   * @param container - The entity's root Container (used as map key)
   */
  removeEntity(container: Container): void {
    if (this._dyingEntities.has(container)) return; // already dying
    this._dyingEntities.add(container);

    // Already invisible from the spawn-time fall — just clean up.
    if (this._fallingFromSpawn.has(container)) {
      this._destroyEntity(container);
      return;
    }

    const label = this._entityLabels.get(container);
    const healthBar = this._entityHealthBars.get(container);
    if (healthBar) updateHealthBar(healthBar, 0);

    if (this._mapType === 'land') {
      // Freeze in place. Mark the label "(Dead)" and dim the corpse.
      if (label) {
        const text = label.children[0];
        if (text instanceof Text && !text.text.endsWith(' (Dead)')) {
          text.text = `${text.text} (Dead)`;
        }
        label.alpha = 0.7;
      }
      container.alpha = 0.55;
      // Make the corpse non-interactive — it should never intercept pointer
      // events meant for the drawing canvas or other live entities.
      container.eventMode = 'none';
      container.cursor = 'default';
      container.removeAllListeners();
      this._deadInPlace.add(container);
      return;
    }

    // Water sinks more slowly than sky falls; both fade to zero scale + alpha.
    const isSky = this._mapType === 'sky';
    const duration = isSky ? 1000 : 1800;
    const descentPx = isSky ? 60 : 0;
    let elapsed = 0;
    const initialScaleX = container.scale.x;
    const initialScaleY = container.scale.y;
    const initialY = container.y;

    const animate = (ticker: Ticker): void => {
      // The container can be destroyed externally (cleanupOrphans on phase
      // transition) before this animation completes. Touching scale/alpha on
      // a destroyed container throws and kills the whole Pixi ticker.
      if (container.destroyed) {
        this._app.ticker.remove(animate);
        return;
      }
      elapsed += ticker.deltaMS;
      const t = Math.min(1, elapsed / duration);
      const factor = 1 - t;
      container.scale.set(initialScaleX * factor, initialScaleY * factor);
      container.alpha = factor;
      if (label && !label.destroyed) label.alpha = factor;
      if (descentPx > 0) {
        container.y = initialY + descentPx * t;
        const spriteH = this._entitySpriteHeights.get(container);
        if (label && !label.destroyed && spriteH !== undefined) {
          label.y = container.y - (spriteH * Math.abs(factor)) / 2 - 6;
        }
      }
      if (t >= 1) {
        this._app.ticker.remove(animate);
        this._destroyEntity(container);
      }
    };

    this._app.ticker.add(animate);
  }

  /**
   * Begin the spawn-time fall animation for a non-flier on a sky map.
   * Runs for SKY_FALL_DURATION_MS — the entity's HP stays full server-side
   * during this window; the server snaps HP to 0 at the same instant for all
   * fallers, then the bridge removes the entity (already invisible).
   */
  private _startFallFromSpawn(container: Container): void {
    this._fallingFromSpawn.add(container);

    const duration = 1000; // matches server SKY_FALL_SECONDS
    const descentPx = 60;
    let elapsed = 0;
    const initialScaleX = container.scale.x;
    const initialScaleY = container.scale.y;
    const initialY = container.y;
    const label = this._entityLabels.get(container);

    const animate = (ticker: Ticker): void => {
      if (container.destroyed) {
        this._app.ticker.remove(animate);
        return;
      }
      elapsed += ticker.deltaMS;
      const t = Math.min(1, elapsed / duration);
      const factor = 1 - t;
      container.scale.set(initialScaleX * factor, initialScaleY * factor);
      container.alpha = factor;
      if (label && !label.destroyed) label.alpha = factor;
      container.y = initialY + descentPx * t;
      const spriteH = this._entitySpriteHeights.get(container);
      if (label && !label.destroyed && spriteH !== undefined) {
        label.y = container.y - (spriteH * Math.abs(factor)) / 2 - 6;
      }
      if (t >= 1) {
        this._app.ticker.remove(animate);
        // Stay at scale 0 / alpha 0 until the server-driven removal lands.
      }
    };

    this._app.ticker.add(animate);
  }

  /**
   * Destroy a corpse or fully-faded entity: drop all map references and free
   * GPU resources for both the container and its label.
   */
  private _destroyEntity(container: Container): void {
    const label = this._entityLabels.get(container);

    // Delete from all maps BEFORE destroy() to prevent leaked texture references
    this._entityStates.delete(container);
    this._entityTextures.delete(container);
    this._entityProfiles.delete(container);
    this._entityLabels.delete(container);
    this._entitySpriteHeights.delete(container);
    this._entityHp.delete(container);
    this._entityMaxHp.delete(container);
    this._entityHealthBars.delete(container);
    this._dyingEntities.delete(container);
    this._deadInPlace.delete(container);
    this._fallingFromSpawn.delete(container);
    // These tickers iterate maps keyed by container — orphaned entries would
    // touch a destroyed container next tick and kill the whole Pixi loop.
    this._lungeAnimations.delete(container);
    this._bounceCooldowns.delete(container);

    // Clean UUID-keyed maps (multiplayer mode)
    const entityId = this._entityIdByContainer.get(container);
    if (entityId !== undefined) {
      this._entityContainersById.delete(entityId);
    }
    this._entityIdByContainer.delete(container);

    // Clean companion relationships — remove this entity from all companion sets
    this._companions.delete(container);
    for (const [, compSet] of this._companions) {
      compSet.delete(container);
    }

    label?.destroy({ children: true });
    container.destroy({ children: true });
  }

  /**
   * Destroy any frozen corpses left over from a previous round.
   * Called by single-player startRound() to clean up land-map corpses.
   */
  clearCorpses(): void {
    for (const container of this._deadInPlace) {
      this._destroyEntity(container);
    }
    this._deadInPlace.clear();
  }

  /**
   * Immediately destroy every multiplayer-tracked entity (survivors AND corpses)
   * with no death animation. Called by MultiplayerWorldBridge at round restart
   * so that healthy survivors don't get incorrectly treated as fresh kills when
   * the server clears the schema.
   *
   * Each destroy is wrapped in try/catch so a single broken container can't
   * abort the rest of the cleanup pass.
   */
  cleanupAllEntities(): void {
    const containers = Array.from(this._entityIdByContainer.keys());
    for (const container of containers) {
      try {
        this._destroyEntity(container);
      } catch (err) {
        console.error('[WorldStage] cleanupAllEntities: destroy failed:', err);
      }
    }
  }

  /**
   * Destroy any tracked entity whose entityId is NOT in `currentIds`.
   *
   * - When `preserveDying === true` (during simulate), entities mid-death
   *   (water sink, air fall, dead-on-land corpses) are preserved so their
   *   animations / corpse visuals can complete or persist for the round.
   * - When `preserveDying === false` (any non-simulate phase), every orphan
   *   is destroyed immediately — corpses included. This is the key call that
   *   guarantees no leftover entity from round N can persist into round N+1,
   *   regardless of phase-transition timing or which patches the bridge
   *   actually observed.
   *
   * Called every state callback by MultiplayerWorldBridge.
   */
  cleanupOrphans(currentIds: Set<string>, preserveDying: boolean): void {
    const toDestroy: Container[] = [];
    for (const [container, entityId] of this._entityIdByContainer) {
      if (currentIds.has(entityId)) continue;
      if (preserveDying && this._dyingEntities.has(container)) continue;
      toDestroy.push(container);
    }
    for (const container of toDestroy) {
      try {
        this._destroyEntity(container);
      } catch (err) {
        console.error('[WorldStage] cleanupOrphans: destroy failed:', err);
      }
    }
  }

  /** True if a multiplayer entity with this UUID is currently tracked. */
  hasEntity(entityId: string): boolean {
    return this._entityContainersById.has(entityId);
  }
}
