import type { CSSProperties } from 'react';

type DrawPhaseSubmitButtonProps = {
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
  onSubmit: () => void;
};

export function DrawPhaseSubmitButton({
  canvasBounds,
  onSubmit,
}: DrawPhaseSubmitButtonProps): React.JSX.Element {
  const confirmStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '5px',
    WebkitTextStroke: 'var(--stroke) #0f6b7f',
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
        className="ui-pill-button ui-pill-button--mint h-[72px] min-w-[212px] px-7"
      >
        <span className="relative z-1 inline-block">
          <span
            aria-hidden
            className="t20-eb pointer-events-none absolute inset-0 text-center uppercase text-transparent"
            style={confirmStrokeStyle}
          >
            Submit Drawing
          </span>
          <span className="t20-eb relative text-center uppercase text-white">Submit Drawing</span>
        </span>
      </button>
    </div>
  );
}
