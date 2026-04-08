import type { ThicknessPreset } from '../drawing/StrokeRenderer';

export interface StudioControlsState {
  isCanvasEmpty: boolean;
  isWorldMode: boolean;
  isSubmitting: boolean;
  isMockMode: boolean;
  selectedThickness: ThicknessPreset;
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
}

export interface StudioController extends StudioControlsStore, StudioControlsActions {
  setMockMode(enabled: boolean): void;
}
