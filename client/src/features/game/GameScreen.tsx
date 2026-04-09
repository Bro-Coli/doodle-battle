import { useEffect, useRef, useState } from 'react';
import { Application, Renderer } from 'pixi.js';
import { DrawingCanvas } from '../drawing/DrawingCanvas';
import { WorldStage } from '../world/WorldStage';
import { MultiplayerWorldBridge } from '../world/MultiplayerWorldBridge';
import { exportPng } from '../drawing/exportPng';
import { captureEntityTexture } from '../world/captureEntityTexture';
import { setStrokeColor } from '../drawing/StrokeRenderer';
import { TEAM_TINTS } from '../world/EntitySprite';
import { getActiveRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';

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

function TimerBanner({ seconds }: { seconds: number }): React.JSX.Element {
  const display = Math.max(0, Math.ceil(seconds));
  return (
    <div className="fixed left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl bg-black/75 px-6 py-2 text-center font-bold text-2xl text-white">
      {display}s
    </div>
  );
}

function DrawPhaseOverlay({
  phaseTimer,
  currentRound,
  maxRounds,
  onSubmit,
}: {
  phaseTimer: number;
  currentRound: number;
  maxRounds: number;
  onSubmit: () => void;
}): React.JSX.Element {
  return (
    <>
      <div className="fixed left-1/2 top-4 z-20 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-black/75 px-6 py-2">
        <span className="font-bold text-white/60 text-lg">
          Round {currentRound + 1}/{maxRounds}
        </span>
        <span className="text-white/30">|</span>
        <span className="font-bold text-2xl text-white">
          {Math.max(0, Math.ceil(phaseTimer))}s
        </span>
      </div>
      <div className="fixed bottom-8 left-1/2 z-20 -translate-x-1/2">
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-2xl bg-green-500 px-10 py-4 text-xl font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-green-400 active:scale-95"
        >
          Submit Drawing
        </button>
      </div>
    </>
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

  players.forEach((p) => {
    if (p.team === myTeam) {
      teammates.push(p);
    } else {
      opponents.push(p);
    }
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center">
      {/* Header */}
      <div className="mt-6 rounded-xl bg-black/75 px-6 py-2 text-lg font-bold text-white">
        Waiting for players...
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
        <div className="rounded-xl bg-red-900/60 px-4 py-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-red-300">
            {myTeam === 'red' ? 'Your Team (Red)' : 'Red Team'}
          </p>
          <ul className="flex flex-col gap-1">
            {teammates.map((p) => (
              <li key={p.name} className="flex items-center gap-2 text-sm text-white">
                <span>{p.hasSubmittedDrawing ? '✓' : '○'}</span>
                <span>{p.name}</span>
              </li>
            ))}
            {teammates.length === 0 && (
              <li className="text-xs text-white/40">No teammates</li>
            )}
          </ul>
        </div>

        {/* Opponents */}
        <div className="rounded-xl bg-blue-900/60 px-4 py-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-blue-300">
            Opponents
          </p>
          <ul className="flex flex-col gap-1">
            {opponents.map((p) => (
              <li key={p.name} className="flex items-center gap-2 text-sm text-white">
                <span>{p.hasSubmittedDrawing ? '✓' : '○'}</span>
                <span>{p.name}</span>
              </li>
            ))}
            {opponents.length === 0 && (
              <li className="text-xs text-white/40">No opponents</li>
            )}
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
}: {
  entityCounts: { red: number; blue: number };
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
        <p className="mt-4 text-sm text-white/50">Next round starting soon...</p>
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
    winner === 'red'
      ? 'Red Team Wins!'
      : winner === 'blue'
        ? 'Blue Team Wins!'
        : "It's a Draw!";

  const winnerColor =
    winner === 'red'
      ? 'text-red-400'
      : winner === 'blue'
        ? 'text-blue-400'
        : 'text-yellow-300';

  // Sort by team then kills desc
  const rows = Object.entries(stats).sort(([, a], [, b]) => {
    if (a.team !== b.team) return a.team < b.team ? -1 : 1;
    return b.kills - a.kills;
  });

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl bg-[#1a1035]/95 px-8 py-8 shadow-2xl ring-1 ring-white/10">
        {/* Winner announcement */}
        <h1 className={`mb-6 text-center text-4xl font-black ${winnerColor}`}>
          {winnerLabel}
        </h1>

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

  // Refs for PixiJS objects (stable across renders)
  const appRef = useRef<Application<Renderer> | null>(null);
  const drawingCanvasRef = useRef<DrawingCanvas | null>(null);
  const worldStageRef = useRef<WorldStage | null>(null);
  const bridgeRef = useRef<MultiplayerWorldBridge | null>(null);

  // Snapshot ref for imperative access from callbacks
  const snapshotRef = useRef<GameSnapshot>(snapshot);
  snapshotRef.current = snapshot;

  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  // Track previous phase for transition logic
  const prevPhaseRef = useRef<string>('idle');

  // Track my team (derived from room state once, stable)
  const myTeamRef = useRef<string>('red');

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
        background: '#1a1035',
      });
      app.canvas.className = 'block h-screen w-screen';
      host.appendChild(app.canvas);
      appRef.current = app;

      const worldStage = new WorldStage(app);
      worldStageRef.current = worldStage;

      const drawingCanvas = new DrawingCanvas(app);
      drawingCanvasRef.current = drawingCanvas;
      worldStage.drawingRoot.addChild(drawingCanvas.region);

      // Set up bridge
      const bridge = new MultiplayerWorldBridge(worldStage);
      bridgeRef.current = bridge;
      bridge.connect(room);

      // Store our session ID on worldStage so it can identify our entity
      if (room) worldStage.mySessionId = room.sessionId;

      // Start in draw mode — worldRoot hidden, drawingRoot visible
      // WorldStage starts with worldRoot hidden by default

      cleanupPixi = () => {
        bridge.disconnect();
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

        if (currentPhase === 'draw') {
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
            setStrokeColor(teamTint);
          }

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
    };
  }, [room]);

  // Auto-submit when timer hits 0 and player hasn't submitted yet
  useEffect(() => {
    if (
      snapshot.currentPhase === 'draw' &&
      snapshot.phaseTimer <= 0 &&
      !hasSubmitted
    ) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.phaseTimer, snapshot.currentPhase]);

  function handleSubmit(): void {
    if (hasSubmittedRef.current) return;

    const app = appRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const bridge = bridgeRef.current;

    if (!app || !drawingCanvas || !bridge) return;

    // Export current drawing (empty canvas returns null — submit anyway with empty)
    const imageDataUrl = exportPng(app, drawingCanvas.strokeContainerRef, drawingCanvas.region);
    const dataUrl = imageDataUrl ?? '';

    // Store for waiting overlay display
    if (dataUrl) {
      setCapturedImageUrl(dataUrl);
    }

    // Capture transparent-background texture for entity sprite rendering
    const worldStage = worldStageRef.current;
    if (worldStage && drawingCanvas.strokeContainerRef.children.length > 0) {
      worldStage.capturedDrawingTexture = captureEntityTexture(app, drawingCanvas.strokeContainerRef);
    }

    // Send to server
    bridge.submitDrawing(dataUrl);

    // Mark submitted
    setHasSubmitted(true);
    hasSubmittedRef.current = true;
  }

  function handleBackToLobby(): void {
    room?.send('return_to_lobby');
    navigate('/waiting');
  }

  function handleMainMenu(): void {
    room?.leave();
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
    <div className="relative h-screen w-screen overflow-hidden">
      {/* PixiJS canvas host — always mounted */}
      <div id="game-pixi-host" className="absolute inset-0" />

      {/* Phase overlays — React on top of canvas */}
      {currentPhase === 'draw' && !hasSubmitted && (
        <DrawPhaseOverlay
          phaseTimer={phaseTimer}
          currentRound={currentRound}
          maxRounds={maxRounds}
          onSubmit={handleSubmit}
        />
      )}

      {currentPhase === 'draw' && hasSubmitted && (
        <WaitingOverlay
          capturedImageUrl={capturedImageUrl}
          players={players}
          myTeam={myTeam}
        />
      )}

      {currentPhase === 'simulate' && (
        <SimulationOverlay phaseTimer={phaseTimer} entityCounts={entityCounts} />
      )}

      {currentPhase === 'results' && (
        <ResultsOverlay entityCounts={entityCounts} />
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
