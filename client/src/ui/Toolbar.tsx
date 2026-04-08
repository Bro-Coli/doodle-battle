import type { ThicknessPreset } from '../drawing/StrokeRenderer';
import { ActionButtons } from './ActionButtons';
import { ThicknessToggle } from './ThicknessToggle';
import { MockModeBadge } from './MockModeBadge';

interface ToolbarProps {
  canSubmit: boolean;
  canUndo: boolean;
  canClear: boolean;
  canChangeThickness: boolean;
  isWorldMode: boolean;
  isMockMode: boolean;
  selectedThickness: ThicknessPreset;
  onSubmit: () => void;
  onUndo: () => void;
  onClear: () => void;
  onToggleView: () => void;
  onSetThickness: (preset: ThicknessPreset) => void;
}

export function Toolbar({
  canSubmit,
  canUndo,
  canClear,
  canChangeThickness,
  isWorldMode,
  isMockMode,
  selectedThickness,
  onSubmit,
  onUndo,
  onClear,
  onToggleView,
  onSetThickness,
}: ToolbarProps) {
  return (
    <div id="toolbar" role="toolbar" aria-label="Studio controls">
      <ActionButtons
        canSubmit={canSubmit}
        canUndo={canUndo}
        canClear={canClear}
        isWorldMode={isWorldMode}
        onSubmit={onSubmit}
        onUndo={onUndo}
        onClear={onClear}
        onToggleView={onToggleView}
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
