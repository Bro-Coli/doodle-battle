interface ActionButtonsProps {
  canSubmit: boolean;
  canUndo: boolean;
  canClear: boolean;
  canStartRound: boolean;
  isWorldMode: boolean;
  isRoundActive: boolean;
  onSubmit: () => void;
  onUndo: () => void;
  onClear: () => void;
  onToggleView: () => void;
  onStartRound: () => void;
}

export function ActionButtons({
  canSubmit,
  canUndo,
  canClear,
  canStartRound,
  isWorldMode,
  isRoundActive,
  onSubmit,
  onUndo,
  onClear,
  onToggleView,
  onStartRound,
}: ActionButtonsProps) {
  return (
    <div className="toolbar__group">
      <button type="button" onClick={onSubmit} disabled={!canSubmit}>
        Submit
      </button>
      <button type="button" onClick={onClear} disabled={!canClear}>
        Clear
      </button>
      <button type="button" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" id="view-toggle" onClick={onToggleView} disabled={isRoundActive}>
        {isWorldMode ? 'Draw' : 'World'}
      </button>
      <button
        type="button"
        id="start-round"
        onClick={onStartRound}
        disabled={!canStartRound}
        className={canStartRound ? 'start-round--ready' : ''}
      >
        Start Round
      </button>
    </div>
  );
}
