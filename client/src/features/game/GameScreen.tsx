import { useEffect, useRef, useState, useCallback } from 'react';
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
import {
  DrawPhaseSubmitButton,
  IdleOverlay,
  ObjectiveBanner,
  ResultsOverlay,
  SimulationOverlay,
  WaitingOverlay,
  WinnerOverlay,
} from './overlays';

type PlayerSnapshot = {
  name: string;
  team: string;
  hasSubmittedDrawing: boolean;
};

type GameSnapshot = {
  currentPhase: string;
  phaseTimer: number;
  players: Map<string, PlayerSnapshot>;
  entityCounts: { red: number; blue: number };
  currentRound: number;
  maxRounds: number;
};

type PlayerStat = {
  name: string;
  team: string;
  entitiesDrawn: number;
  entitiesSurviving: number;
  kills: number;
};

type WinnerData = {
  winner: string;
  stats: Record<string, PlayerStat>;
};

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

  const appRef = useRef<Application<Renderer> | null>(null);
  const drawingCanvasRef = useRef<DrawingCanvas | null>(null);
  const worldStageRef = useRef<WorldStage | null>(null);
  const bridgeRef = useRef<MultiplayerWorldBridge | null>(null);
  const toolbarWidthRef = useRef(0);
  const TOOLBAR_GAP = 24;

  const snapshotRef = useRef<GameSnapshot>(snapshot);
  snapshotRef.current = snapshot;

  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  const prevPhaseRef = useRef<string>('idle');
  const myTeamRef = useRef<string>('red');
  const drawPhaseTotalRef = useRef(30);
  const intentionalStayRef = useRef(false);

  useEffect(() => {
    if (!room) {
      navigate('/');
      return;
    }

    const removeGameFinished = room.onMessage('game_finished', (msg: WinnerData) => {
      setWinnerData(msg);
    });

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

      const bridge = new MultiplayerWorldBridge(worldStage);
      bridgeRef.current = bridge;
      bridge.connect(room);

      if (room) worldStage.mySessionId = room.sessionId;

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

      const myPlayer = players.get(activeRoom.sessionId);
      if (myPlayer) {
        myTeamRef.current = myPlayer.team;
      }

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

      const prevPhase = prevPhaseRef.current;
      if (prevPhase !== currentPhase) {
        prevPhaseRef.current = currentPhase;

        if (prevPhase === 'draw' && !hasSubmittedRef.current) {
          const dc = drawingCanvasRef.current;
          const br = bridgeRef.current;
          const ap = appRef.current;
          if (dc && br && ap) {
            dc.commitCurrentStroke();
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

          setHasSubmitted(false);
          hasSubmittedRef.current = false;
          setCapturedImageUrl(null);

          if (prevPhase === 'idle') {
            setWinnerData(null);
          }

          const teamTint = TEAM_TINTS[myTeamRef.current];
          if (teamTint !== undefined) {
            drawingCanvasRef.current?.setBrushColor(teamTint);
          }

          drawingCanvasRef.current?.setTool('brush');
          setActiveTool('brush');
          setCanvasEmpty(true);

          const stage = worldStageRef.current;
          if (stage) {
            if (stage.inWorld) stage.toggle();
            drawingCanvasRef.current?.clear();
          }
        } else if (currentPhase === 'simulate' || currentPhase === 'results') {
          const stage = worldStageRef.current;
          if (stage && !stage.inWorld) stage.toggle();
        }
      }

      setSnapshot({ currentPhase, phaseTimer, players, entityCounts, currentRound, maxRounds });
    }

    takeSnapshot();

    const stateCallback = () => {
      takeSnapshot();
    };
    room.onStateChange(stateCallback);

    return () => {
      room.onStateChange.remove(stateCallback);
      removeGameFinished();
      cleanupPixi?.();
      if (!intentionalStayRef.current) {
        leaveActiveRoom();
      }
    };
  }, [room]);

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

    drawingCanvas.commitCurrentStroke();

    if (drawingCanvas.isEmpty) return;

    const imageDataUrl = exportPng(app, drawingCanvas.strokeContainerRef, drawingCanvas.region);
    const dataUrl = imageDataUrl ?? '';

    if (dataUrl) {
      setCapturedImageUrl(dataUrl);
    }

    const worldStage = worldStageRef.current;
    if (worldStage && drawingCanvas.strokeContainerRef.children.length > 0) {
      worldStage.capturedDrawingTexture = captureEntityTexture(
        app,
        drawingCanvas.strokeContainerRef,
      );
    }

    bridge.submitDrawing(dataUrl);

    setHasSubmitted(true);
    hasSubmittedRef.current = true;
  }

  function handleBackToLobby(): void {
    intentionalStayRef.current = true;
    room?.send('return_to_lobby');
    navigate('/waiting');
  }

  function handleMainMenu(): void {
    intentionalStayRef.current = true;
    leaveActiveRoom();
    navigate('/');
  }

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
      <div
        id="game-pixi-host"
        className="absolute inset-0"
        style={{ background: 'var(--gradient-lobby)' }}
      />

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

      {winnerData && (
        <WinnerOverlay
          winner={winnerData.winner}
          stats={winnerData.stats}
          mySessionId={room.sessionId}
          onBackToLobby={handleBackToLobby}
          onMainMenu={handleMainMenu}
        />
      )}

      {currentPhase === 'idle' && !winnerData && <IdleOverlay />}
    </div>
  );
}
