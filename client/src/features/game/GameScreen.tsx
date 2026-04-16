import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { Application, Renderer } from 'pixi.js';
import { DrawingCanvas } from '../drawing/DrawingCanvas';
import type { DrawTool } from '../drawing/DrawingCanvas';
import { WorldStage } from '../world/WorldStage';
import { MultiplayerWorldBridge } from '../world/MultiplayerWorldBridge';
import { exportPng } from '../drawing/exportPng';
import { captureEntityTexture } from '../world/captureEntityTexture';
import { TEAM_TINTS } from '../world/EntitySprite';
import { getActiveRoom, leaveActiveRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { DrawToolbar } from './DrawToolbar';
import { CountdownRing } from '../scenario/parts/CountdownRing';
import { StrokeShadowText } from '../../ui/text/StrokeShadowText';

// ─── Snapshot types ───────────────────────────────────────────────────────────

interface PlayerSnapshot {
  name: string;
  team: string;
  hasSubmittedDrawing: boolean;
}

interface GameSnapshot {
  currentPhase: string;
  phaseTimer: number;
  players: Map<string, PlayerSnapshot>;
  entityCounts: { red: number; blue: number };
  currentRound: number;
  maxRounds: number;
}

interface PlayerStat {
  name: string;
  team: string;
  entitiesDrawn: number;
  entitiesSurviving: number;
  kills: number;
}

interface WinnerData {
  winner: string;
  stats: Record<string, PlayerStat>;
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function ObjectiveBanner({
  canvasBounds,
}: {
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
}): React.JSX.Element {
  return (
    <div
      className="fixed z-20"
      style={{
        left: '50%',
        top: canvasBounds ? (56 + canvasBounds.y) / 2 : 76,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="ui-objective-banner whitespace-nowrap">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-1 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
        >
          <path
            d="M12 2L4 6V12C4 16.42 7.38 20.54 12 22C16.62 20.54 20 16.42 20 12V6L12 2Z"
            fill="url(#shield-gradient)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="0.8"
          />
          <path
            d="M12 7.5L13.1 10.1L15.8 10.3L13.7 12.1L14.4 14.8L12 13.3L9.6 14.8L10.3 12.1L8.2 10.3L10.9 10.1L12 7.5Z"
            fill="rgba(255, 255, 255, 0.95)"
          />
          <defs>
            <linearGradient id="shield-gradient" x1="12" y1="2" x2="12" y2="22">
              <stop stopColor="#7DD3FC" />
              <stop offset="1" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
        </svg>

        <span className="relative z-1">
          <StrokeShadowText
            className="t20-eb tracking-wide normal-case!"
            firstStrokeColor="#595B9D"
            secondStrokeColor="#2D2E4A"
            firstStrokeWidth={6}
            secondStrokeWidth={6}
            shadowOffsetY="0.15rem"
          >
            <span
              style={{
                background: 'linear-gradient(to bottom, #ffffff, #EFD6A0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SURVIVE
            </span>{' '}
            - Have more creatures alive
          </StrokeShadowText>
        </span>
      </div>
    </div>
  );
}

function TimerBanner({ seconds }: { seconds: number }): React.JSX.Element {
  const display = Math.max(0, Math.ceil(seconds));
  return (
    <div className="fixed left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl bg-black/75 px-6 py-2 text-center font-bold text-2xl text-white">
      {display}s
    </div>
  );
}

function DrawPhaseSubmitButton({
  canvasBounds,
  onSubmit,
}: {
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
  onSubmit: () => void;
}): React.JSX.Element {
  const confirmStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '5px',
    WebkitTextStroke: 'var(--stroke) #0f6b7f',
  };

  return (
    <div
      className="fixed z-20"
      style={
        canvasBounds
          ? {
              left: '50%',
              top: canvasBounds.y + canvasBounds.height + 42,
              transform: 'translateX(-50%)',
            }
          : {
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
            }
      }
    >
      <button
        type="button"
        onClick={onSubmit}
        className="ui-pill-button ui-pill-button--mint min-w-[212px] px-7 h-[72px]"
      >
        <span className="relative z-1 inline-block">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t20-eb"
            style={confirmStrokeStyle}
          >
            Submit Drawing
          </span>
          <span className="relative text-center uppercase text-white t20-eb">Submit Drawing</span>
        </span>
      </button>
    </div>
  );
}

function WaitingOverlay({
  capturedImageUrl,
  players,
  myTeam,
}: {
  capturedImageUrl: string | null;
  players: Map<string, PlayerSnapshot>;
  myTeam: string;
}): React.JSX.Element {
  const teammates: PlayerSnapshot[] = [];
  const opponents: PlayerSnapshot[] = [];
  let allSubmitted = true;

  players.forEach((p) => {
    if (p.team === myTeam) {
      teammates.push(p);
    } else {
      opponents.push(p);
    }
    if (!p.hasSubmittedDrawing) allSubmitted = false;
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center">
      {/* Header */}
      <div className="mt-6 rounded-xl bg-black/75 px-6 py-2 text-lg font-bold text-white">
        {allSubmitted ? 'Bringing drawings to life...' : 'Waiting for players...'}
      </div>

      {/* Center: own drawing */}
      <div className="mt-4 flex flex-1 items-center justify-center">
        {capturedImageUrl ? (
          <div className="rounded-xl border-4 border-white/30 bg-white p-2 shadow-2xl">
            <img
              src={capturedImageUrl}
              alt="Your drawing"
              className="max-h-64 max-w-xs object-contain"
            />
          </div>
        ) : (
          <div className="rounded-xl bg-white/10 px-8 py-6 text-white/60">Drawing submitted</div>
        )}
      </div>

      {/* Player statuses */}
      <div className="mb-8 flex gap-6">
        {/* Teammates */}
        <div
          className={`rounded-xl px-4 py-3 ${myTeam === 'red' ? 'bg-red-900/60' : 'bg-blue-900/60'}`}
        >
          <p
            className={`mb-2 text-xs font-black uppercase tracking-widest ${myTeam === 'red' ? 'text-red-300' : 'text-blue-300'}`}
          >
            Your Team ({myTeam === 'red' ? 'Red' : 'Blue'})
          </p>
          <ul className="flex flex-col gap-1">
            {teammates.map((p) => (
              <li key={p.name} className="flex items-center gap-2 text-sm text-white">
                <span>{p.hasSubmittedDrawing ? '✓' : '○'}</span>
                <span>{p.name}</span>
              </li>
            ))}
            {teammates.length === 0 && <li className="text-xs text-white/40">No teammates</li>}
          </ul>
        </div>

        {/* Opponents */}
        <div
          className={`rounded-xl px-4 py-3 ${myTeam === 'red' ? 'bg-blue-900/60' : 'bg-red-900/60'}`}
        >
          <p
            className={`mb-2 text-xs font-black uppercase tracking-widest ${myTeam === 'red' ? 'text-blue-300' : 'text-red-300'}`}
          >
            Opponents
          </p>
          <ul className="flex flex-col gap-1">
            {opponents.map((p) => (
              <li key={p.name} className="flex items-center gap-2 text-sm text-white">
                <span>{p.hasSubmittedDrawing ? '✓' : '○'}</span>
                <span>{p.name}</span>
              </li>
            ))}
            {opponents.length === 0 && <li className="text-xs text-white/40">No opponents</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SimulationOverlay({
  phaseTimer,
  entityCounts,
}: {
  phaseTimer: number;
  entityCounts: { red: number; blue: number };
}): React.JSX.Element {
  return (
    <>
      <TimerBanner seconds={phaseTimer} />
      <div className="fixed left-1/2 top-16 z-20 -translate-x-1/2 rounded-xl bg-black/70 px-6 py-2 text-sm font-bold text-white">
        <span className="text-red-400">Red: {entityCounts.red}</span>
        <span className="mx-3 text-white/40">|</span>
        <span className="text-blue-400">Blue: {entityCounts.blue}</span>
      </div>
    </>
  );
}

function ResultsOverlay({
  entityCounts,
  isFinalRound,
}: {
  entityCounts: { red: number; blue: number };
  isFinalRound: boolean;
}): React.JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
      <div className="rounded-2xl bg-black/85 px-10 py-8 text-center shadow-2xl">
        <h2 className="mb-4 text-2xl font-black text-white">Round Results</h2>
        <div className="flex gap-8">
          <div>
            <p className="text-4xl font-black text-red-400">{entityCounts.red}</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-red-300">
              Red Surviving
            </p>
          </div>
          <div className="self-center text-white/30 text-2xl">vs</div>
          <div>
            <p className="text-4xl font-black text-blue-400">{entityCounts.blue}</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-blue-300">
              Blue Surviving
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/50">
          {isFinalRound ? 'Final results incoming...' : 'Next round starting soon...'}
        </p>
      </div>
    </div>
  );
}

function WinnerOverlay({
  winner,
  stats,
  mySessionId,
  onBackToLobby,
  onMainMenu,
}: {
  winner: string;
  stats: Record<string, PlayerStat>;
  mySessionId: string;
  onBackToLobby: () => void;
  onMainMenu: () => void;
}): React.JSX.Element {
  const winnerLabel =
    winner === 'red' ? 'Red Team Wins!' : winner === 'blue' ? 'Blue Team Wins!' : "It's a Draw!";

  const winnerColor =
    winner === 'red' ? 'text-red-400' : winner === 'blue' ? 'text-blue-400' : 'text-yellow-300';

  // Sort by team then kills desc
  const rows = Object.entries(stats).sort(([, a], [, b]) => {
    if (a.team !== b.team) return a.team < b.team ? -1 : 1;
    return b.kills - a.kills;
  });

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl bg-[#1a1035]/95 px-8 py-8 shadow-2xl ring-1 ring-white/10">
        {/* Winner announcement */}
        <h1 className={`mb-6 text-center text-4xl font-black ${winnerColor}`}>{winnerLabel}</h1>

        {/* Per-player stats table */}
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b border-white/20 text-xs font-black uppercase tracking-widest text-white/50">
              <th className="pb-2 text-left">Player</th>
              <th className="pb-2 text-left">Team</th>
              <th className="pb-2 text-right">Drawn</th>
              <th className="pb-2 text-right">Surviving</th>
              <th className="pb-2 text-right">Kills</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([sessionId, stat]) => {
              const isMe = sessionId === mySessionId;
              const teamColor = stat.team === 'red' ? 'text-red-400' : 'text-blue-400';
              return (
                <tr
                  key={sessionId}
                  className={`border-b border-white/10 ${isMe ? 'bg-white/10 font-bold' : ''}`}
                >
                  <td className="py-2 text-white">
                    {stat.name}
                    {isMe && (
                      <span className="ml-2 rounded bg-white/20 px-1 py-0.5 text-xs text-white/60">
                        you
                      </span>
                    )}
                  </td>
                  <td className={`py-2 capitalize ${teamColor}`}>{stat.team}</td>
                  <td className="py-2 text-right text-white">{stat.entitiesDrawn}</td>
                  <td className="py-2 text-right text-white">{stat.entitiesSurviving}</td>
                  <td className="py-2 text-right text-white">{stat.kills}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBackToLobby}
            className="flex-1 rounded-xl bg-white/90 py-3 font-black uppercase tracking-wide text-[#1a1035] transition hover:bg-white active:scale-95"
          >
            Back to Lobby
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex-1 rounded-xl border border-white/30 py-3 font-bold text-white/70 transition hover:bg-white/10 active:scale-95"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main GameScreen ──────────────────────────────────────────────────────────

export function GameScreen(): React.JSX.Element {
  const room = getActiveRoom();

  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    currentPhase: 'idle',
    phaseTimer: 0,
    players: new Map(),
    entityCounts: { red: 0, blue: 0 },
    currentRound: 0,
    maxRounds: 5,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [winnerData, setWinnerData] = useState<WinnerData | null>(null);
  const [activeTool, setActiveTool] = useState<DrawTool>('brush');
  const [canvasEmpty, setCanvasEmpty] = useState(true);
  const [canvasBounds, setCanvasBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Refs for PixiJS objects (stable across renders)
  const appRef = useRef<Application<Renderer> | null>(null);
  const drawingCanvasRef = useRef<DrawingCanvas | null>(null);
  const worldStageRef = useRef<WorldStage | null>(null);
  const bridgeRef = useRef<MultiplayerWorldBridge | null>(null);
  const toolbarWidthRef = useRef(0);
  const TOOLBAR_GAP = 24;

  // Snapshot ref for imperative access from callbacks
  const snapshotRef = useRef<GameSnapshot>(snapshot);
  snapshotRef.current = snapshot;

  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  // Track previous phase for transition logic
  const prevPhaseRef = useRef<string>('idle');

  // Track my team (derived from room state once, stable)
  const myTeamRef = useRef<string>('red');

  const drawPhaseTotalRef = useRef(30);

  // When true, the unmount cleanup will NOT leave the room.
  // Set by handlers that intentionally keep the player in the room (e.g., Back to Lobby),
  // so browser back / tab close / uncontrolled unmounts still trigger room.leave() and
  // the server's onLeave forfeit logic fires for remaining players.
  const intentionalStayRef = useRef(false);

  useEffect(() => {
    if (!room) {
      navigate('/');
      return;
    }

    // ─── Register game_finished handler SYNCHRONOUSLY before async PixiJS init ─

    const removeGameFinished = room.onMessage('game_finished', (msg: WinnerData) => {
      setWinnerData(msg);
    });

    // ─── PixiJS initialization ────────────────────────────────────────────────

    const host = document.getElementById('game-pixi-host');
    if (!host) return;

    let cleanupPixi: (() => void) | undefined;

    void (async () => {
      const app = new Application();
      await app.init({
        resizeTo: window,
        autoDensity: true,
        backgroundAlpha: 0,
      });
      app.canvas.className = 'block h-screen w-screen';
      host.appendChild(app.canvas);
      appRef.current = app;

      const worldStage = new WorldStage(app);
      worldStageRef.current = worldStage;

      const drawingCanvas = new DrawingCanvas(app);
      drawingCanvasRef.current = drawingCanvas;
      setCanvasBounds(drawingCanvas.canvasBounds);
      worldStage.drawingRoot.addChild(drawingCanvas.region);

      drawingCanvas.undoStack.onChange = () => {
        setCanvasEmpty(drawingCanvas.isEmpty);
      };

      // Set up bridge
      const bridge = new MultiplayerWorldBridge(worldStage);
      bridgeRef.current = bridge;
      bridge.connect(room);

      // Store our session ID on worldStage so it can identify our entity
      if (room) worldStage.mySessionId = room.sessionId;

      // Start in draw mode — worldRoot hidden, drawingRoot visible
      // WorldStage starts with worldRoot hidden by default

      // If already in draw phase (hot reload or reconnect), set brush color now.
      // The normal phase-transition logic may have fired before DrawingCanvas existed.
      const roomState = room.state as {
        currentPhase?: string;
        players?: Map<string, { team: string }>;
      };
      if (roomState.currentPhase === 'draw') {
        const myPlayer = roomState.players?.get(room.sessionId);
        if (myPlayer) {
          const teamTint = TEAM_TINTS[myPlayer.team];
          if (teamTint !== undefined) {
            drawingCanvas.setBrushColor(teamTint);
          }
        }
      }

      cleanupPixi = () => {
        bridge.disconnect();
        worldStage.destroy();
        app.destroy(true, { children: true });
        host.replaceChildren();
        appRef.current = null;
        drawingCanvasRef.current = null;
        worldStageRef.current = null;
        bridgeRef.current = null;
      };
    })();

    // ─── Colyseus state sync ──────────────────────────────────────────────────
    // Capture room as non-null for use in closures (already guarded above)
    const activeRoom = room;

    function takeSnapshot(): void {
      const state = activeRoom.state as {
        currentPhase?: string;
        phaseTimer?: number;
        currentRound?: number;
        maxRounds?: number;
        players?: Map<string, { name: string; team: string; hasSubmittedDrawing: boolean }>;
        entities?: Map<string, { teamId: string }>;
      };

      const players = new Map<string, PlayerSnapshot>();
      if (state.players) {
        state.players.forEach(
          (p: { name: string; team: string; hasSubmittedDrawing: boolean }, sessionId: string) => {
            players.set(sessionId, {
              name: p.name,
              team: p.team,
              hasSubmittedDrawing: p.hasSubmittedDrawing ?? false,
            });
          },
        );
      }

      // Derive my team
      const myPlayer = players.get(activeRoom.sessionId);
      if (myPlayer) {
        myTeamRef.current = myPlayer.team;
      }

      // Count entities by team
      const entityCounts = { red: 0, blue: 0 };
      if (state.entities) {
        state.entities.forEach((e: { teamId: string }) => {
          if (e.teamId === 'red') entityCounts.red++;
          else if (e.teamId === 'blue') entityCounts.blue++;
        });
      }

      const currentPhase = state.currentPhase ?? 'idle';
      const phaseTimer = state.phaseTimer ?? 0;
      const currentRound = state.currentRound ?? 0;
      const maxRounds = state.maxRounds ?? 5;

      // Handle phase transitions
      const prevPhase = prevPhaseRef.current;
      if (prevPhase !== currentPhase) {
        prevPhaseRef.current = currentPhase;

        // Fallback auto-submit: if draw phase ended without submission, submit now.
        // This catches edge cases where the timer-based auto-submit didn't fire in time.
        // Skip if canvas is empty — no entity should spawn for blank drawings.
        if (prevPhase === 'draw' && !hasSubmittedRef.current) {
          // Inline submit logic — handleSubmit() may not be stable yet during mount
          const dc = drawingCanvasRef.current;
          const br = bridgeRef.current;
          const ap = appRef.current;
          if (dc && br && ap) {
            dc.commitCurrentStroke();
            // Only submit if something was drawn
            if (!dc.isEmpty) {
              const dataUrl = exportPng(ap, dc.strokeContainerRef, dc.region) ?? '';
              br.submitDrawing(dataUrl);
              setHasSubmitted(true);
              hasSubmittedRef.current = true;
              if (dataUrl) setCapturedImageUrl(dataUrl);
            }
          }
        }

        if (currentPhase === 'draw') {
          drawPhaseTotalRef.current = phaseTimer > 0 ? Math.ceil(phaseTimer) : 30;

          // Reset submission state for new round
          setHasSubmitted(false);
          hasSubmittedRef.current = false;
          setCapturedImageUrl(null);

          // Clear winner data when a new game/round starts from idle
          if (prevPhase === 'idle') {
            setWinnerData(null);
          }

          // Set stroke color to team color so drawings are visually team-coded
          const teamTint = TEAM_TINTS[myTeamRef.current];
          if (teamTint !== undefined) {
            drawingCanvasRef.current?.setBrushColor(teamTint);
          }

          // Reset tool back to brush for new round
          drawingCanvasRef.current?.setTool('brush');
          setActiveTool('brush');
          setCanvasEmpty(true);

          // Show drawing root, hide world root
          const stage = worldStageRef.current;
          if (stage) {
            if (stage.inWorld) stage.toggle();
            drawingCanvasRef.current?.clear();
          }
        } else if (currentPhase === 'simulate' || currentPhase === 'results') {
          // Show world root, hide drawing root
          const stage = worldStageRef.current;
          if (stage && !stage.inWorld) stage.toggle();
        }
      }

      setSnapshot({ currentPhase, phaseTimer, players, entityCounts, currentRound, maxRounds });
    }

    // Take initial snapshot
    takeSnapshot();

    const stateCallback = () => {
      takeSnapshot();
    };
    room.onStateChange(stateCallback);

    return () => {
      room.onStateChange.remove(stateCallback);
      removeGameFinished();
      cleanupPixi?.();
      // Browser back, route change, or tab close while mid-game: leave the room
      // so the server's onLeave handler runs and forfeits on behalf of the player.
      // Skipped when an in-app handler intentionally kept us in the room.
      if (!intentionalStayRef.current) {
        leaveActiveRoom();
      }
    };
  }, [room]);

  // Auto-submit when timer is about to expire (1s buffer beats server phase transition)
  useEffect(() => {
    if (
      snapshot.currentPhase === 'draw' &&
      snapshot.phaseTimer <= 1 &&
      snapshot.phaseTimer >= 0 &&
      !hasSubmitted
    ) {
      handleSubmit();
    }
  }, [snapshot.phaseTimer, snapshot.currentPhase]);

  const handleToolChange = useCallback((tool: DrawTool) => {
    drawingCanvasRef.current?.setTool(tool);
    setActiveTool(tool);
  }, []);

  const handleUndo = useCallback(() => {
    drawingCanvasRef.current?.undo();
  }, []);

  const handleClear = useCallback(() => {
    drawingCanvasRef.current?.clear();
    setCanvasEmpty(true);
  }, []);

  const repositionCanvas = useCallback(() => {
    const dc = drawingCanvasRef.current;
    if (!dc) return;
    const leftReserved = toolbarWidthRef.current > 0 ? toolbarWidthRef.current + TOOLBAR_GAP : 0;
    dc.reposition(window.innerWidth, window.innerHeight, leftReserved);
    setCanvasBounds({ ...dc.canvasBounds });
  }, [TOOLBAR_GAP]);

  const handleToolbarWidthMeasured = useCallback(
    (width: number) => {
      toolbarWidthRef.current = width;
      repositionCanvas();
    },
    [repositionCanvas],
  );

  useEffect(() => {
    const onResize = () => repositionCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [repositionCanvas]);

  function handleSubmit(): void {
    if (hasSubmittedRef.current) return;

    const app = appRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const bridge = bridgeRef.current;

    if (!app || !drawingCanvas || !bridge) return;

    // Commit any in-progress stroke (user may be mid-draw when timer expires)
    drawingCanvas.commitCurrentStroke();

    // Skip submission if canvas is empty — no entity should spawn for blank drawings
    if (drawingCanvas.isEmpty) return;

    // Export current drawing
    const imageDataUrl = exportPng(app, drawingCanvas.strokeContainerRef, drawingCanvas.region);
    const dataUrl = imageDataUrl ?? '';

    // Store for waiting overlay display
    if (dataUrl) {
      setCapturedImageUrl(dataUrl);
    }

    // Capture transparent-background texture for entity sprite rendering
    const worldStage = worldStageRef.current;
    if (worldStage && drawingCanvas.strokeContainerRef.children.length > 0) {
      worldStage.capturedDrawingTexture = captureEntityTexture(
        app,
        drawingCanvas.strokeContainerRef,
      );
    }

    // Send to server
    bridge.submitDrawing(dataUrl);

    // Mark submitted
    setHasSubmitted(true);
    hasSubmittedRef.current = true;
  }

  function handleBackToLobby(): void {
    // Intentional in-room navigation: stay in the room so we can re-ready up.
    intentionalStayRef.current = true;
    room?.send('return_to_lobby');
    navigate('/waiting');
  }

  function handleMainMenu(): void {
    // Prevent the unmount cleanup from double-leaving (harmless, but cleaner).
    intentionalStayRef.current = true;
    leaveActiveRoom();
    navigate('/');
  }

  // Redirect if no room
  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1035] text-white">
        Redirecting...
      </div>
    );
  }

  const { currentPhase, phaseTimer, players, entityCounts, currentRound, maxRounds } = snapshot;
  const myTeam = myTeamRef.current;

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: 'var(--gradient-lobby)' }}
    >
      {/* PixiJS canvas host — always mounted */}
      <div
        id="game-pixi-host"
        className="absolute inset-0"
        style={{ background: 'var(--gradient-lobby)' }}
      />

      {/* Phase overlays — React on top of canvas */}
      {currentPhase === 'draw' && !hasSubmitted && (
        <>
          <div className="fixed right-4 top-4 z-20">
            <CountdownRing
              remaining={phaseTimer}
              total={drawPhaseTotalRef.current}
              currentRound={currentRound}
              maxRounds={maxRounds}
            />
          </div>
          <DrawPhaseSubmitButton canvasBounds={canvasBounds} onSubmit={handleSubmit} />
          <ObjectiveBanner canvasBounds={canvasBounds} />
          <DrawToolbar
            activeTool={activeTool}
            canUndo={!canvasEmpty}
            canClear={!canvasEmpty}
            canvasBounds={canvasBounds}
            onToolChange={handleToolChange}
            onUndo={handleUndo}
            onClear={handleClear}
            onWidthMeasured={handleToolbarWidthMeasured}
          />
        </>
      )}

      {currentPhase === 'draw' && hasSubmitted && (
        <WaitingOverlay capturedImageUrl={capturedImageUrl} players={players} myTeam={myTeam} />
      )}

      {currentPhase === 'simulate' && (
        <SimulationOverlay phaseTimer={phaseTimer} entityCounts={entityCounts} />
      )}

      {currentPhase === 'results' && (
        <ResultsOverlay entityCounts={entityCounts} isFinalRound={currentRound + 1 >= maxRounds} />
      )}

      {/* Winner overlay — driven by client-local winnerData, NOT currentPhase.
          When one player clicks "Back to Lobby", currentPhase resets to idle on
          the shared Schema, but the other player should still see the winner
          screen until they choose an action themselves. */}
      {winnerData && (
        <WinnerOverlay
          winner={winnerData.winner}
          stats={winnerData.stats}
          mySessionId={room.sessionId}
          onBackToLobby={handleBackToLobby}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Idle state — brief between phases */}
      {currentPhase === 'idle' && !winnerData && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
          <div className="rounded-xl bg-black/70 px-8 py-4 text-lg font-bold text-white">
            Waiting for game to start...
          </div>
        </div>
      )}
    </div>
  );
}
