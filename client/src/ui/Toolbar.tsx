import type { ThicknessPreset } from '../drawing/StrokeRenderer';
import { ActionButtons } from './ActionButtons';
import { ThicknessToggle } from './ThicknessToggle';
import { MockModeBadge } from './MockModeBadge';

interface ToolbarProps {
  canSubmit: boolean;
  canUndo: boolean;
  canClear: boolean;
  canChangeThickness: boolean;
  canStartRound: boolean;
  isWorldMode: boolean;
  isRoundActive: boolean;
  isMockMode: boolean;
  selectedThickness: ThicknessPreset;
  onSubmit: () => void;
  onUndo: () => void;
  onClear: () => void;
  onToggleView: () => void;
  onStartRound: () => void;
  onSetThickness: (preset: ThicknessPreset) => void;
}

export function Toolbar({
  canSubmit,
  canUndo,
  canClear,
  canChangeThickness,
  canStartRound,
  isWorldMode,
  isRoundActive,
  isMockMode,
  selectedThickness,
  onSubmit,
  onUndo,
  onClear,
  onToggleView,
  onStartRound,
  onSetThickness,
}: ToolbarProps) {
  return (
    <div id="toolbar" role="toolbar" aria-label="Studio controls">
      <ActionButtons
        canSubmit={canSubmit}
        canUndo={canUndo}
        canClear={canClear}
        canStartRound={canStartRound}
        isWorldMode={isWorldMode}
        isRoundActive={isRoundActive}
        onSubmit={onSubmit}
        onUndo={onUndo}
        onClear={onClear}
        onToggleView={onToggleView}
        onStartRound={onStartRound}
      />
      <ThicknessToggle
        disabled={!canChangeThickness}
        selected={selectedThickness}
        onSelect={onSetThickness}
      />
      {isMockMode ? <MockModeBadge /> : null}
    </div>
  );
}
