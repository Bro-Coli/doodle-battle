import type { ReactNode } from 'react';
import { useEffect } from 'react';

import resultVictoryTitle from './assets/result-victory-title.webp';
import resultVsText from './assets/scenario-vs-text.webp';
import { ResultScoreCard } from './ResultScoreCard';

type TeamSlot = {
  label: string;
  variant: 'pink' | 'blue';
  score: number;
};

type VictoryResultPageProps = {
  /** Your (winning) team. Rendered on the LEFT with the "YOU" badge. */
  myTeam?: TeamSlot;
  /** Opposing team. Rendered on the RIGHT. */
  oppTeam?: TeamSlot;
  /** Stats slot rendered directly below MY team's score card. */
  myTeamStats?: ReactNode;
  /** Stats slot rendered directly below the opposing team's score card. */
  oppTeamStats?: ReactNode;
  /** Extra content rendered at the bottom (after the stats columns). */
  children?: ReactNode;
};

const DEFAULT_MY_TEAM: TeamSlot = { label: 'Blue Team', variant: 'blue', score: 5 };
const DEFAULT_OPP_TEAM: TeamSlot = { label: 'Red Team', variant: 'pink', score: 3 };

export function VictoryResultPage({
  myTeam = DEFAULT_MY_TEAM,
  oppTeam = DEFAULT_OPP_TEAM,
  myTeamStats,
  oppTeamStats,
  children,
}: VictoryResultPageProps = {}) {
  const hasStats = myTeamStats !== undefined || oppTeamStats !== undefined;
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
      <div className="relative flex w-full flex-1 flex-col items-center justify-start pt-12">
        <img
          src={resultVictoryTitle}
          alt="Victory"
          className="w-full max-w-[600px] scale-x-106 object-contain"
          style={{ aspectRatio: '5306 / 2054' }}
          decoding="async"
          fetchPriority="high"
        />
        <div className="mt-12 flex w-full items-center justify-center gap-10 px-4">
          <ResultScoreCard
            team={myTeam.label}
            score={myTeam.score}
            variant={myTeam.variant}
            winner
            isMyTeam
          />

          <img
            src={resultVsText}
            alt="VS"
            className="h-20 w-auto shrink-0 object-contain lg:h-16"
            style={{ aspectRatio: '1808 / 1335' }}
            decoding="async"
          />

          <ResultScoreCard team={oppTeam.label} score={oppTeam.score} variant={oppTeam.variant} />
        </div>
        {hasStats && (
          <div className="mt-6 flex w-full items-start justify-center gap-10 px-4">
            <div className="w-[400px] shrink-0">{myTeamStats}</div>
            <div
              aria-hidden
              className="invisible h-20 w-auto shrink-0 lg:h-16"
              style={{ aspectRatio: '1808 / 1335' }}
            />
            <div className="w-[400px] shrink-0">{oppTeamStats}</div>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
