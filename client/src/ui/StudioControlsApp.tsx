import { useSyncExternalStore } from 'react';
import { Toolbar } from './Toolbar';
import { RoundOutcomeCard } from './RoundOutcomeCard';
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

  const isRoundActive = state.roundPhase !== 'idle';
  const canDraw = !state.isWorldMode && !state.isSubmitting && !isRoundActive;
  const canStartRound = state.roundPhase === 'idle' && state.entityCount > 0 && !state.isSubmitting && !state.roundOutcome;

  return (
    <>
      <Toolbar
        canSubmit={canDraw && !state.isCanvasEmpty}
        canUndo={canDraw && !state.isCanvasEmpty}
        canClear={canDraw && !state.isCanvasEmpty}
        canChangeThickness={canDraw}
        canStartRound={canStartRound}
        isWorldMode={state.isWorldMode}
        isRoundActive={isRoundActive || !!state.roundOutcome}
        isMockMode={state.isMockMode}
        selectedThickness={state.selectedThickness}
        onSubmit={() => controller.submit()}
        onUndo={() => controller.undo()}
        onClear={() => controller.clear()}
        onToggleView={() => controller.toggleView()}
        onStartRound={() => controller.startRound()}
        onSetThickness={(preset) => controller.setThickness(preset)}
      />
      {state.roundOutcome && (
        <RoundOutcomeCard
          outcome={state.roundOutcome}
          onDismiss={() => controller.dismissOutcome()}
        />
      )}
    </>
  );
}
