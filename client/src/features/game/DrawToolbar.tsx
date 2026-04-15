import { useRef, useState, useEffect } from 'react';
import { Icon } from '../../ui/icon/Icon';
import type { DrawTool } from '../drawing/DrawingCanvas';
import brushImage from './assets/brush.png';
import eraserImage from './assets/eraser.png';

interface DrawToolbarProps {
  activeTool: DrawTool;
  canUndo: boolean;
  canClear: boolean;
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
  onToolChange: (tool: DrawTool) => void;
  onUndo: () => void;
  onClear: () => void;
  onWidthMeasured?: (width: number) => void;
}

function ToolButton({
  active = false,
  label,
  icon,
  onClick,
  className,
}: {
  active?: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}): React.JSX.Element {
  const usesSystemIconButton = className?.includes('ui-icon-button');
  const usesToolCard = className?.includes('draw-tool-card');

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        usesSystemIconButton || usesToolCard
          ? ''
          : [
              'flex h-11 w-11 items-center justify-center rounded-xl transition',
              active
                ? 'bg-white text-[#3E46E7] shadow-md'
                : 'text-white/80 hover:bg-white/20 active:scale-90',
            ].join(' '),
        className,
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
  canvasBounds,
  onToolChange,
  onUndo,
  onClear,
  onWidthMeasured,
}: DrawToolbarProps): React.JSX.Element {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const onWidthMeasuredRef = useRef(onWidthMeasured);
  onWidthMeasuredRef.current = onWidthMeasured;

  useEffect(() => {
    if (!toolbarRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.borderBoxSize[0].inlineSize;
      setToolbarWidth(w);
      onWidthMeasuredRef.current?.(w);
    });
    ro.observe(toolbarRef.current, { box: 'border-box' });
    return () => ro.disconnect();
  }, []);

  const GAP = 24;
  const positionStyle: React.CSSProperties =
    canvasBounds && toolbarWidth > 0
      ? { position: 'fixed', left: canvasBounds.x - toolbarWidth - GAP, top: canvasBounds.y }
      : { position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)' };

  return (
    <div
      ref={toolbarRef}
      style={positionStyle}
      className="z-20 flex flex-col gap-2 rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(203,167,255,0.78)_0%,rgba(180,137,241,0.74)_38%,rgba(156,111,226,0.76)_72%,rgba(133,86,210,0.8)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-8px_18px_rgba(104,63,173,0.3),0_10px_28px_rgba(34,12,84,0.28)] backdrop-blur-md"
    >
      <ToolButton
        active={activeTool === 'brush'}
        label="Brush"
        className={[
          'draw-tool-card relative flex h-[88px] w-[136px] items-center justify-center overflow-hidden rounded-[22px] border transition',
          'before:pointer-events-none before:absolute before:left-[8px] before:right-[8px] before:top-[8px] before:h-[40%] before:rounded-[16px]',
          'before:bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(255,255,255,0.18)_48%,rgba(255,255,255,0.04)_100%)]',
          'after:pointer-events-none after:absolute after:left-[14px] after:top-[12px] after:h-[12px] after:w-[26px] after:rotate-[-26deg] after:rounded-full after:bg-white/45 after:blur-[1px]',
          activeTool === 'brush'
            ? 'border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.2)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-10px_20px_rgba(255,255,255,0.06),0_0_0_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(79,48,144,0.22)]'
            : 'border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.12)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-10px_20px_rgba(255,255,255,0.04),0_8px_18px_rgba(79,48,144,0.14)] hover:bg-white/20 active:translate-y-[2px]',
        ].join(' ')}
        icon={
          <img
            src={brushImage}
            alt=""
            className="relative z-[1] block h-14 w-14 object-contain drop-shadow-[0_3px_4px_rgba(41,24,95,0.28)]"
          />
        }
        onClick={() => onToolChange('brush')}
      />
      <ToolButton
        active={activeTool === 'eraser'}
        label="Eraser"
        className={[
          'draw-tool-card relative flex h-[88px] w-[136px] items-center justify-center overflow-hidden rounded-[22px] border transition',
          'before:pointer-events-none before:absolute before:left-[8px] before:right-[8px] before:top-[8px] before:h-[40%] before:rounded-[16px]',
          'before:bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(255,255,255,0.18)_48%,rgba(255,255,255,0.04)_100%)]',
          'after:pointer-events-none after:absolute after:left-[14px] after:top-[12px] after:h-[12px] after:w-[26px] after:rotate-[-26deg] after:rounded-full after:bg-white/45 after:blur-[1px]',
          activeTool === 'eraser'
            ? 'border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.2)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-10px_20px_rgba(255,255,255,0.06),0_0_0_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(79,48,144,0.22)]'
            : 'border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.12)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-10px_20px_rgba(255,255,255,0.04),0_8px_18px_rgba(79,48,144,0.14)] hover:bg-white/20 active:translate-y-[2px]',
        ].join(' ')}
        icon={
          <img
            src={eraserImage}
            alt=""
            className="relative z-[1] block h-14 w-14 object-contain drop-shadow-[0_3px_4px_rgba(41,24,95,0.28)]"
          />
        }
        onClick={() => onToolChange('eraser')}
      />

      <div className="mt-1 flex items-center gap-2">
        <ToolButton
          label="Undo"
          className="ui-icon-button ui-icon-button--toolbar text-white"
          icon={<Icon name="undo" size={30} strokeWidth={4} />}
          onClick={() => {
            if (!canUndo) return;
            onUndo();
          }}
        />
        <ToolButton
          label="Clear"
          className="ui-icon-button ui-icon-button--toolbar ui-icon-button--toolbar-violet text-white"
          icon={<Icon name="trash" size={30} strokeWidth={4} />}
          onClick={() => {
            if (!canClear) return;
            onClear();
          }}
        />
      </div>
    </div>
  );
}
