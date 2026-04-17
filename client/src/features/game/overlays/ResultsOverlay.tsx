import { cn } from '@/shared/lib/cn';
import { GameOverlay, GameOverlayCard, GameOverlayTitle } from '@/ui/overlay/GameOverlay';

type ResultsOverlayProps = {
  entityCounts: { red: number; blue: number };
  isFinalRound: boolean;
};

function TeamScore({
  count,
  team,
  isWinning,
}: {
  count: number;
  team: 'red' | 'blue';
  isWinning: boolean;
}): React.JSX.Element {
  const colors = {
    red: {
      text: 'text-red-400',
      label: 'text-red-300',
      glow: isWinning ? 'drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]' : '',
    },
    blue: {
      text: 'text-blue-400',
      label: 'text-blue-300',
      glow: isWinning ? 'drop-shadow-[0_0_20px_rgba(96,165,250,0.5)]' : '',
    },
  };

  return (
    <div className={cn('text-center', colors[team].glow)}>
      <p
        className={cn(
          't48-eb tabular-nums transition-transform',
          colors[team].text,
          isWinning && 'scale-110',
        )}
      >
        {count}
      </p>
      <p className={cn('mt-1 text-sm font-bold uppercase tracking-widest', colors[team].label)}>
        {team === 'red' ? 'Red' : 'Blue'} Surviving
      </p>
    </div>
  );
}

export function ResultsOverlay({
  entityCounts,
  isFinalRound,
}: ResultsOverlayProps): React.JSX.Element {
  const redWinning = entityCounts.red > entityCounts.blue;
  const blueWinning = entityCounts.blue > entityCounts.red;

  return (
    <GameOverlay centered>
      <GameOverlayCard className="animate-[scaleIn_0.4s_ease-out_both]">
        <GameOverlayTitle className="mb-6">Round Results</GameOverlayTitle>

        <div className="flex items-center gap-8">
          <TeamScore count={entityCounts.red} team="red" isWinning={redWinning} />

          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl text-white/30">vs</span>
          </div>

          <TeamScore count={entityCounts.blue} team="blue" isWinning={blueWinning} />
        </div>

        <p className="mt-6 text-sm text-white/50">
          {isFinalRound ? 'Final results incoming...' : 'Next round starting soon...'}
        </p>
      </GameOverlayCard>
    </GameOverlay>
  );
}
