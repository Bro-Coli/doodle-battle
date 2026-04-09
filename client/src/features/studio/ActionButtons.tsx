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
  const baseButtonClass =
    'select-none rounded-[5px] border px-[18px] py-1.5 text-sm font-semibold tracking-[0.03em] transition';
  const enabledButtonClass =
    'cursor-pointer border-neutral-400 bg-white text-neutral-700 opacity-100 hover:bg-neutral-200';
  const disabledButtonClass =
    'cursor-not-allowed border-neutral-400 bg-neutral-100 text-neutral-400 opacity-55';
  const viewToggleClass = `${baseButtonClass} ${
    isRoundActive
      ? 'cursor-not-allowed border-neutral-400 bg-neutral-100 text-neutral-400 opacity-55'
      : 'cursor-pointer border-neutral-500 bg-neutral-800 text-white opacity-100 hover:border-neutral-600 hover:bg-neutral-600'
  }`;
  const startRoundClass = `${baseButtonClass} ${
    canStartRound
      ? 'cursor-pointer border-transparent bg-emerald-500 text-white opacity-100 hover:bg-emerald-600'
      : 'cursor-not-allowed border-transparent bg-neutral-300 text-neutral-500 opacity-55'
  }`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-2">
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`${baseButtonClass} ${canSubmit ? enabledButtonClass : disabledButtonClass}`}
      >
        Submit
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={!canClear}
        className={`${baseButtonClass} ${canClear ? enabledButtonClass : disabledButtonClass}`}
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className={`${baseButtonClass} ${canUndo ? enabledButtonClass : disabledButtonClass}`}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onToggleView}
        disabled={isRoundActive}
        className={viewToggleClass}
      >
        {isWorldMode ? 'Draw' : 'World'}
      </button>
      <button
        type="button"
        onClick={onStartRound}
        disabled={!canStartRound}
        className={startRoundClass}
      >
        Start Round
      </button>
    </div>
  );
}
