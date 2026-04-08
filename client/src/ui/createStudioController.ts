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
    setState({ isCanvasEmpty: drawingCanvas.isEmpty });
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

    setMockMode(enabled: boolean): void {
      setState({ isMockMode: enabled });
    },
  };
}
