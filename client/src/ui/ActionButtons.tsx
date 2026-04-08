interface ActionButtonsProps {
  canSubmit: boolean;
  canUndo: boolean;
  canClear: boolean;
  isWorldMode: boolean;
  onSubmit: () => void;
  onUndo: () => void;
  onClear: () => void;
  onToggleView: () => void;
}

export function ActionButtons({
  canSubmit,
  canUndo,
  canClear,
  isWorldMode,
  onSubmit,
  onUndo,
  onClear,
  onToggleView,
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
      <button type="button" id="view-toggle" onClick={onToggleView}>
        {isWorldMode ? 'Draw' : 'World'}
      </button>
    </div>
  );
}
