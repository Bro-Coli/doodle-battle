import { cn } from '@/shared/lib/cn';
import { GameOverlay, GameOverlayCard, GameOverlayTitle } from '@/ui/overlay/GameOverlay';

type Team = 'red' | 'blue';

type ResultsOverlayProps = {
  entityCounts: { red: number; blue: number };
  isFinalRound: boolean;
  currentRound: number;
  maxRounds: number;
  myTeam: Team;
};

function YouBadge(): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg px-3 py-1 font-black text-sm tracking-[0.22em] uppercase"
      style={{
        background: 'linear-gradient(180deg, #FFE788 0%, #FFC93C 55%, #E08A00 100%)',
        color: '#4A2A00',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 0 rgba(80,44,0,0.55), 0 0 14px rgba(255,200,60,0.5)',
      }}
    >
      You
    </span>
  );
}

function TeamScore({
  team,
  count,
  isMine,
}: {
  team: Team;
  count: number;
  isMine: boolean;
}): React.JSX.Element {
  return (
    <div className="relative flex flex-col items-center">
      <div className="h-9 mb-1.5 flex items-end">{isMine ? <YouBadge /> : null}</div>
      <div
        className={cn(
          'ui-hud-counter',
          team === 'red' ? 'ui-hud-counter--red' : 'ui-hud-counter--blue',
        )}
      >
        {count}
      </div>
    </div>
  );
}

export function ResultsOverlay({
  entityCounts,
  isFinalRound,
  currentRound,
  maxRounds,
  myTeam,
}: ResultsOverlayProps): React.JSX.Element {
  const redWin = entityCounts.red > entityCounts.blue;
  const blueWin = entityCounts.blue > entityCounts.red;
  const isDraw = !redWin && !blueWin;

  const titleColor = isDraw ? 'default' : redWin ? 'red' : 'blue';
  const titleText = isDraw ? 'Stalemate' : redWin ? 'Red Wins' : 'Blue Wins';

  const statusHeadline = isFinalRound ? 'Match Over' : 'Next Round';
  const statusSubline = isFinalRound
    ? 'Tallying final results…'
    : 'A new map awaits — get ready to draw';

  const roundDisplay = Math.min(currentRound + 1, maxRounds);

  return (
    <GameOverlay centered>
      <GameOverlayCard
        className={cn(
          'animate-[scaleIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]',
          'relative min-w-[480px] px-12! py-10! text-center',
        )}
      >
        <p className="mb-2 font-nunito text-xl font-black tracking-[0.2em] text-white/80 uppercase">
          Round {roundDisplay} / {maxRounds}
        </p>

        <GameOverlayTitle className="mb-8" size="lg" color={titleColor}>
          {titleText}
        </GameOverlayTitle>

        <div className="mb-4 flex items-end justify-center gap-10">
          <TeamScore team="red" count={entityCounts.red} isMine={myTeam === 'red'} />
          <span aria-hidden className="mb-16 block h-3 w-12 rounded-lg bg-white/60 " />
          <TeamScore team="blue" count={entityCounts.blue} isMine={myTeam === 'blue'} />
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="font-nunito text-lg font-black tracking-[0.28em] text-white/65 uppercase">
            {statusHeadline}
          </p>
          <p className="mt-1 font-nunito text-md font-bold tracking-wide text-white/40">
            {statusSubline}
          </p>
        </div>
      </GameOverlayCard>
    </GameOverlay>
  );
}
