import { Icon } from '../../ui/icon/Icon';
import type { DrawTool } from '../drawing/DrawingCanvas';

interface DrawToolbarProps {
  activeTool: DrawTool;
  canUndo: boolean;
  canClear: boolean;
  onToolChange: (tool: DrawTool) => void;
  onUndo: () => void;
  onClear: () => void;
}

function ToolButton({
  active = false,
  disabled = false,
  label,
  icon,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex h-11 w-11 items-center justify-center rounded-xl transition',
        active
          ? 'bg-white text-[#3E46E7] shadow-md'
          : disabled
            ? 'text-white/25 cursor-default'
            : 'text-white/80 hover:bg-white/20 active:scale-90',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}

export function DrawToolbar({
  activeTool,
  canUndo,
  canClear,
  onToolChange,
  onUndo,
  onClear,
}: DrawToolbarProps): React.JSX.Element {
  return (
    <div className="fixed left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 rounded-2xl bg-black/60 p-2 backdrop-blur-sm">
      <ToolButton
        active={activeTool === 'brush'}
        label="Brush"
        icon={<Icon name="brush" size={22} />}
        onClick={() => onToolChange('brush')}
      />
      <ToolButton
        active={activeTool === 'eraser'}
        label="Eraser"
        icon={<Icon name="eraser" size={22} />}
        onClick={() => onToolChange('eraser')}
      />

      <div className="mx-auto my-1 h-px w-6 bg-white/20" />

      <ToolButton
        disabled={!canUndo}
        label="Undo"
        icon={<Icon name="undo" size={22} />}
        onClick={onUndo}
      />
      <ToolButton
        disabled={!canClear}
        label="Clear"
        icon={<Icon name="trash" size={22} />}
        onClick={onClear}
      />
    </div>
  );
}
