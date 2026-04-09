import type { Application } from 'pixi.js';
import type { DrawingCanvas } from '../drawing/DrawingCanvas';
import type { ThicknessPreset } from '../drawing/StrokeRenderer';
import { exportPng } from '../drawing/exportPng';
import { recognizeDrawing } from '../recognition/recognizeApi';
import type { RecognitionOverlay } from '../recognition/RecognitionOverlay';
import type { WorldStage } from '../world/WorldStage';
import type { StudioController, StudioControlsState } from './types';

interface CreateStudioControllerOptions {
  app: Application;
  drawingCanvas: DrawingCanvas;
  overlay: RecognitionOverlay;
  worldStage: WorldStage;
}

export function createStudioController({
  app,
  drawingCanvas,
  overlay,
  worldStage,
}: CreateStudioControllerOptions): StudioController {
  const listeners = new Set<() => void>();

  let state: StudioControlsState = {
    isCanvasEmpty: drawingCanvas.isEmpty,
    isWorldMode: worldStage.inWorld,
    isSubmitting: false,
    isMockMode: false,
    selectedThickness: 'medium',
    roundPhase: worldStage.roundPhase,
    entityCount: worldStage.entityCount,
    roundOutcome: null,
  };

  // Wire round phase changes from WorldStage into React state
  worldStage.onRoundPhaseChange = (phase) => {
    if (phase === 'idle' && worldStage.lastOutcome) {
      // Round just ended — show outcome card (stay in world view)
      setState({
        roundPhase: phase,
        roundOutcome: worldStage.lastOutcome,
        entityCount: worldStage.entityCount,
      });
    } else {
      setState({
        roundPhase: phase,
        roundOutcome: null,
        entityCount: worldStage.entityCount,
      });
    }
  };

  const emit = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setState = (partial: Partial<StudioControlsState>): void => {
    state = { ...state, ...partial };
    emit();
  };

  const syncCanvasState = (): void => {
    setState({ isCanvasEmpty: drawingCanvas.isEmpty, entityCount: worldStage.entityCount });
  };

  const executeRecognition = (dataUrl: string): void => {
    setState({ isSubmitting: true });
    overlay.showSpinner();

    void (async () => {
      try {
        const profile = await recognizeDrawing(dataUrl);
        overlay.showCard(profile, () => {
          worldStage.spawnEntity(app, drawingCanvas.strokeContainerRef, profile);
          drawingCanvas.clear();
          setState({ isSubmitting: false });
          syncCanvasState();
        });
      } catch {
        overlay.showError(
          'Recognition failed. Try again.',
          () => {
            setState({ isSubmitting: false });
            syncCanvasState();
          },
          () => {
            setState({ isSubmitting: false });
            executeRecognition(dataUrl);
          },
        );
      }
    })();
  };

  drawingCanvas.undoStack.onChange = syncCanvasState;

  return {
    getSnapshot(): StudioControlsState {
      return state;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    submit(): void {
      if (state.isCanvasEmpty || state.isWorldMode || state.isSubmitting) {
        return;
      }

      const dataUrl = exportPng(app, drawingCanvas.strokeContainerRef, drawingCanvas.region);
      if (dataUrl === null) {
        return;
      }

      executeRecognition(dataUrl);
    },

    clear(): void {
      if (state.isWorldMode || state.isSubmitting) {
        return;
      }

      drawingCanvas.clear();
    },

    undo(): void {
      if (state.isWorldMode || state.isSubmitting) {
        return;
      }

      drawingCanvas.undo();
    },

    toggleView(): void {
      worldStage.toggle();
      setState({ isWorldMode: worldStage.inWorld });
      syncCanvasState();
    },

    setThickness(preset: ThicknessPreset): void {
      if (state.isWorldMode || state.isSubmitting) {
        return;
      }

      drawingCanvas.setThickness(preset);
      setState({ selectedThickness: preset });
    },

    startRound(): void {
      if (state.roundPhase !== 'idle' || state.entityCount === 0) return;

      // Auto-switch to world view
      if (!state.isWorldMode) {
        worldStage.toggle();
        setState({ isWorldMode: true });
      }

      void worldStage.startRound();
    },

    dismissOutcome(): void {
      // Switch back to draw mode and clear the outcome
      if (state.isWorldMode) {
        worldStage.toggle();
      }
      setState({ isWorldMode: false, roundOutcome: null, entityCount: worldStage.entityCount });
    },

    setMockMode(enabled: boolean): void {
      setState({ isMockMode: enabled });
    },
  };
}
