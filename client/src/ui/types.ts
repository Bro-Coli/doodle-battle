import type { ThicknessPreset } from '../drawing/StrokeRenderer';
import type { RoundPhase } from '../world/WorldStage';
import type { RoundOutcome } from '../world/RoundOverlay';

export interface StudioControlsState {
  isCanvasEmpty: boolean;
  isWorldMode: boolean;
  isSubmitting: boolean;
  isMockMode: boolean;
  selectedThickness: ThicknessPreset;
  roundPhase: RoundPhase;
  entityCount: number;
  roundOutcome: RoundOutcome | null;
}

export interface StudioControlsStore {
  getSnapshot(): StudioControlsState;
  subscribe(listener: () => void): () => void;
}

export interface StudioControlsActions {
  submit(): void;
  clear(): void;
  undo(): void;
  toggleView(): void;
  setThickness(preset: ThicknessPreset): void;
  startRound(): void;
  dismissOutcome(): void;
}

export interface StudioController extends StudioControlsStore, StudioControlsActions {
  setMockMode(enabled: boolean): void;
}
