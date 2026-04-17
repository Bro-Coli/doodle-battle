import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/cn';

type DrawPhaseSubmitButtonProps = {
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
  onSubmit: () => void;
  disabled?: boolean;
};

export function DrawPhaseSubmitButton({
  canvasBounds,
  onSubmit,
  disabled = false,
}: DrawPhaseSubmitButtonProps): React.JSX.Element {
  const confirmStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '5px',
    WebkitTextStroke: `var(--stroke) ${disabled ? '#3d3a5e' : '#0f6b7f'}`,
  };

  return (
    <div
      className="fixed z-20 animate-[fadeSlideUp_0.35s_ease-out_both]"
      style={
        canvasBounds
          ? {
              left: '50%',
              top: canvasBounds.y + canvasBounds.height + 42,
              transform: 'translateX(-50%)',
            }
          : {
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
            }
      }
    >
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(
          'ui-pill-button ui-pill-button--mint h-[72px] min-w-[240px] px-8',
          disabled && 'ui-pill-button--ghost-disabled',
        )}
      >
        <span className="relative z-1 inline-flex items-center gap-3">
          <span className="inline-block">
            <span
              aria-hidden
              className="t20-eb pointer-events-none absolute inset-0 text-center uppercase text-transparent"
              style={confirmStrokeStyle}
            >
              {disabled ? 'Draw Something' : 'Submit Drawing'}
            </span>
            <span
              className={cn(
                't20-eb relative text-center uppercase',
                disabled ? 'text-white/60' : 'text-white',
              )}
            >
              {disabled ? 'Draw Something' : 'Submit Drawing'}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
