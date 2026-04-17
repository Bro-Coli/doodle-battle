import { cn } from '@/shared/lib/cn';
import { GameOverlay, GameOverlayCard, GameOverlayTitle } from '@/ui/overlay/GameOverlay';

type ResultsOverlayProps = {
  entityCounts: { red: number; blue: number };
  isFinalRound: boolean;
};

function TeamColumn({
  count,
  team,
  isWinning,
}: {
  count: number;
  team: 'red' | 'blue';
  isWinning: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-[156px] flex-col items-center gap-3 transition-transform duration-300',
        isWinning && 'scale-110',
      )}
    >
      {isWinning ? (
        <div className="hud-crown-float" aria-hidden>
          <svg width="52" height="40" viewBox="0 0 52 40" fill="none">
            <defs>
              <linearGradient id={`crown-${team}`} x1="26" y1="0" x2="26" y2="40">
                <stop offset="0%" stopColor="#FFF8C2" />
                <stop offset="45%" stopColor="#FFD54F" />
                <stop offset="100%" stopColor="#E08A00" />
              </linearGradient>
            </defs>
            <path
              d="M4 36 L8 10 L18 22 L26 4 L34 22 L44 10 L48 36 Z"
              fill={`url(#crown-${team})`}
              stroke="#6B3A10"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="8" cy="10" r="3" fill="#FFF3A8" stroke="#6B3A10" strokeWidth="1.5" />
            <circle cx="26" cy="4" r="3.2" fill="#FFF3A8" stroke="#6B3A10" strokeWidth="1.5" />
            <circle cx="44" cy="10" r="3" fill="#FFF3A8" stroke="#6B3A10" strokeWidth="1.5" />
            <rect x="4" y="32" width="44" height="5" rx="1.5" fill="#F5A623" stroke="#6B3A10" strokeWidth="2" />
          </svg>
        </div>
      ) : (
        <div className="h-10" aria-hidden />
      )}

      <div
        className={cn(
          'ui-hud-counter',
          team === 'red' ? 'ui-hud-counter--red' : 'ui-hud-counter--blue',
        )}
      >
        {count}
      </div>

      <div
        className={cn(
          'inline-flex items-center gap-2 px-4 py-1 rounded-full',
          'text-xs font-black tracking-[0.18em] uppercase',
          team === 'red'
            ? 'bg-[rgba(249,61,92,0.18)] text-[#FFC2CE] ring-1 ring-[rgba(249,61,92,0.35)]'
            : 'bg-[rgba(5,147,220,0.18)] text-[#B0DEFF] ring-1 ring-[rgba(5,147,220,0.35)]',
        )}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background:
              team === 'red'
                ? 'radial-gradient(circle at 30% 30%, #FFE3E8 0%, #FF506E 45%, #C62142 100%)'
                : 'radial-gradient(circle at 30% 30%, #DFF0FF 0%, #5AB2FF 45%, #1776D0 100%)',
            boxShadow:
              team === 'red'
                ? '0 0 8px var(--color-team-red-glow)'
                : '0 0 8px var(--color-team-blue-glow)',
          }}
        />
        {team === 'red' ? 'Red Team' : 'Blue Team'}
      </div>
    </div>
  );
}

export function ResultsOverlay({
  entityCounts,
  isFinalRound,
}: ResultsOverlayProps): React.JSX.Element {
  const redWinning = entityCounts.red > entityCounts.blue;
  const blueWinning = entityCounts.blue > entityCounts.red;
  const isDraw = !redWinning && !blueWinning;

  return (
    <GameOverlay centered>
      <GameOverlayCard className="animate-[scaleIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] min-w-[560px] text-center">
        <div className="mb-2 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 ring-1 ring-white/20 text-xs font-black tracking-[0.2em] text-white/70 uppercase">
          Round Results
        </div>

        <GameOverlayTitle className="mb-8" size="md" color="default">
          {isDraw ? 'Stalemate' : redWinning ? 'Red Advances' : 'Blue Advances'}
        </GameOverlayTitle>

        <div className="flex items-end justify-center gap-6">
          <TeamColumn count={entityCounts.red} team="red" isWinning={redWinning} />
          <div className="pb-6">
            <div className="ui-hud-vs">VS</div>
          </div>
          <TeamColumn count={entityCounts.blue} team="blue" isWinning={blueWinning} />
        </div>

        <p className="mt-8 font-nunito text-base font-bold tracking-wider text-white/55">
          {isFinalRound ? 'Tallying final results…' : 'Next round starting soon…'}
        </p>
      </GameOverlayCard>
    </GameOverlay>
  );
}
