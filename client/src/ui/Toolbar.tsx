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
    <div
      role="toolbar"
      aria-label="Studio controls"
      className="fixed top-4 left-1/2 z-10 flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white/85 px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-sm md:max-w-none md:gap-3 md:px-4"
    >
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
