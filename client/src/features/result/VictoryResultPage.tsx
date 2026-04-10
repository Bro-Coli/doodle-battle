import { useEffect } from 'react';

import resultVictoryTitle from './assets/result-victory-title.webp';
import resultVsText from './assets/scenario-vs-text.webp';
import { ResultScoreCard } from './ResultScoreCard';

export function VictoryResultPage() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let burstTimer: number | null = null;
    let stopTimer: number | null = null;

    void import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;

      confetti({
        particleCount: 150,
        spread: 120,
        startVelocity: 48,
        scalar: 1.45,
        origin: { y: 0.62 },
      });

      burstTimer = window.setInterval(() => {
        confetti({
          particleCount: 34,
          spread: 75,
          startVelocity: 38,
          scalar: 1.35,
          origin: { x: 0.14 + Math.random() * 0.72, y: 0.2 + Math.random() * 0.18 },
        });
      }, 650);

      stopTimer = window.setTimeout(() => {
        if (burstTimer) {
          window.clearInterval(burstTimer);
          burstTimer = null;
        }
      }, 2300);
    });

    return () => {
      cancelled = true;
      if (burstTimer) window.clearInterval(burstTimer);
      if (stopTimer) window.clearTimeout(stopTimer);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, #00C8E4 0%, #08BEE4 22%, #109FDE 44%, #0F7FD4 62%, #0D5FC7 78%, #0B4BB9 90%, #0B3BB2 100%)',
        }}
      />
      <div className="relative flex w-full flex-1 flex-col items-center justify-start pt-16">
        <img
          src={resultVictoryTitle}
          alt="Victory"
          className="w-full max-w-[760px] scale-x-106 object-contain"
          decoding="async"
        />
        <div className="mt-12 flex w-full items-center justify-center gap-10 px-4">
          <ResultScoreCard team="Blue Team" score={5} variant="blue" winner />

          <img
            src={resultVsText}
            alt="VS"
            className="h-20 w-auto shrink-0 object-contain lg:h-16"
            decoding="async"
          />

          <ResultScoreCard team="Red Team" score={3} variant="pink" />
        </div>
      </div>
    </>
  );
}
