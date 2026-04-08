import { useSyncExternalStore } from 'react';
import { Toolbar } from './Toolbar';
import type { StudioController } from './types';

interface StudioControlsAppProps {
  controller: StudioController;
}

export function StudioControlsApp({ controller }: StudioControlsAppProps) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  const canDraw = !state.isWorldMode && !state.isSubmitting;

  return (
    <Toolbar
      canSubmit={canDraw && !state.isCanvasEmpty}
      canUndo={canDraw && !state.isCanvasEmpty}
      canClear={canDraw && !state.isCanvasEmpty}
      canChangeThickness={canDraw}
      isWorldMode={state.isWorldMode}
      isMockMode={state.isMockMode}
      selectedThickness={state.selectedThickness}
      onSubmit={() => controller.submit()}
      onUndo={() => controller.undo()}
      onClear={() => controller.clear()}
      onToggleView={() => controller.toggleView()}
      onSetThickness={(preset) => controller.setThickness(preset)}
    />
  );
}
