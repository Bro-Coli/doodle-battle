import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/cn';

type SimulationOverlayProps = {
  phaseTimer: number;
  entityCounts: { red: number; blue: number };
};

export function SimulationOverlay({
  phaseTimer,
  entityCounts,
}: SimulationOverlayProps): React.JSX.Element {
  const display = Math.max(0, Math.ceil(phaseTimer));
  const isCritical = display > 0 && display <= 5;

  const total = Math.max(1, entityCounts.red + entityCounts.blue);
  const redPct = (entityCounts.red / total) * 100;
  const bluePct = (entityCounts.blue / total) * 100;

  const redRef = useRef<HTMLDivElement>(null);
  const blueRef = useRef<HTMLDivElement>(null);
  const prevRed = useRef(entityCounts.red);
  const prevBlue = useRef(entityCounts.blue);

  useEffect(() => {
    if (entityCounts.red !== prevRed.current) {
      prevRed.current = entityCounts.red;
      const el = redRef.current;
      if (el) {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'hud-counter-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both';
      }
    }
  }, [entityCounts.red]);

  useEffect(() => {
    if (entityCounts.blue !== prevBlue.current) {
      prevBlue.current = entityCounts.blue;
      const el = blueRef.current;
      if (el) {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'hud-counter-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both';
      }
    }
  }, [entityCounts.blue]);

  return (
    <>
      <div className="fixed left-1/2 top-6 z-20 -translate-x-1/2 animate-[fadeSlideDown_0.35s_ease-out_both] pointer-events-none">
        <div
          className={cn(
            'ui-hud-timer',
            isCritical ? 'hud-timer-critical-glow' : 'hud-timer-glow',
          )}
          aria-live="polite"
        >
          <span
            className={cn('ui-hud-timer__value', isCritical && 'animate-pulse')}
            style={
              isCritical
                ? {
                    background:
                      'linear-gradient(180deg, #FFE0DB 0%, #FF6B7F 40%, #E8263F 75%, #9B0B24 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }
                : undefined
            }
          >
            {display}
          </span>
          <span className="ui-hud-timer__unit">S</span>
        </div>
      </div>

      <div
        className="fixed left-1/2 top-40 z-20 -translate-x-1/2 w-[min(92vw,420px)] animate-[fadeSlideDown_0.45s_ease-out_both] pointer-events-none"
        style={{ animationDelay: '0.08s' }}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-4 px-5 py-3',
            'rounded-[22px] border-2 border-white/30',
            'bg-[linear-gradient(180deg,rgba(30,18,70,0.82)_0%,rgba(18,10,48,0.92)_100%)]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-3px_0_rgba(8,4,30,0.5),0_10px_26px_rgba(12,6,40,0.5)]',
            'backdrop-blur-md',
          )}
        >
          <div
            ref={redRef}
            className="flex items-center gap-2.5 min-w-[70px] justify-start"
            style={{ willChange: 'transform' }}
          >
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, #FFE3E8 0%, #FF506E 45%, #C62142 100%)',
                boxShadow:
                  '0 0 10px rgba(253,84,110,0.7), inset 0 0 0 1px rgba(255,255,255,0.25)',
              }}
            />
            <span
              className="font-nunito tabular-nums font-black text-3xl"
              style={{
                background:
                  'linear-gradient(180deg, #FFE7EB 0%, #FF8FA2 45%, #F04560 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 0 rgba(60,8,20,0.55))',
              }}
            >
              {entityCounts.red}
            </span>
          </div>

          <div className="flex-1 px-1">
            <div className="ui-hud-scorebar">
              <div
                className="ui-hud-scorebar__fill ui-hud-scorebar__fill--red"
                style={{ width: `${redPct}%` }}
              />
              <div
                className="ui-hud-scorebar__fill ui-hud-scorebar__fill--blue"
                style={{ width: `${bluePct}%` }}
              />
            </div>
          </div>

          <div
            ref={blueRef}
            className="flex items-center gap-2.5 min-w-[70px] justify-end"
            style={{ willChange: 'transform' }}
          >
            <span
              className="font-nunito tabular-nums font-black text-3xl"
              style={{
                background:
                  'linear-gradient(180deg, #E8F4FF 0%, #7ABEFF 45%, #1F7BDC 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 0 rgba(8,28,72,0.55))',
              }}
            >
              {entityCounts.blue}
            </span>
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, #DFF0FF 0%, #5AB2FF 45%, #1776D0 100%)',
                boxShadow:
                  '0 0 10px rgba(56,189,248,0.7), inset 0 0 0 1px rgba(255,255,255,0.25)',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
