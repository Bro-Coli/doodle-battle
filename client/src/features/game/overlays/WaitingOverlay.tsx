import { cn } from '@/shared/lib/cn';
import { GameOverlay, GameOverlayBadge } from '@/ui/overlay/GameOverlay';

type PlayerSnapshot = {
  name: string;
  team: string;
  hasSubmittedDrawing: boolean;
};

type WaitingOverlayProps = {
  capturedImageUrl: string | null;
  players: Map<string, PlayerSnapshot>;
  myTeam: string;
};

function PlayerStatusList({
  players,
  teamLabel,
  teamColor,
  bgColor,
}: {
  players: PlayerSnapshot[];
  teamLabel: string;
  teamColor: string;
  bgColor: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-2xl px-5 py-4',
        'border border-white/10',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        bgColor,
      )}
    >
      <p className={cn('mb-3 text-xs font-black uppercase tracking-widest', teamColor)}>
        {teamLabel}
      </p>
      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li key={p.name} className="flex items-center gap-3 text-sm text-white">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                p.hasSubmittedDrawing
                  ? 'bg-emerald-500 text-white'
                  : 'border border-white/30 text-white/50',
              )}
            >
              {p.hasSubmittedDrawing ? '✓' : ''}
            </span>
            <span className={p.hasSubmittedDrawing ? 'text-white' : 'text-white/60'}>{p.name}</span>
          </li>
        ))}
        {players.length === 0 && <li className="text-xs text-white/40">No players</li>}
      </ul>
    </div>
  );
}

export function WaitingOverlay({
  capturedImageUrl,
  players,
  myTeam,
}: WaitingOverlayProps): React.JSX.Element {
  const teammates: PlayerSnapshot[] = [];
  const opponents: PlayerSnapshot[] = [];
  let allSubmitted = true;

  players.forEach((p) => {
    if (p.team === myTeam) {
      teammates.push(p);
    } else {
      opponents.push(p);
    }
    if (!p.hasSubmittedDrawing) allSubmitted = false;
  });

  return (
    <GameOverlay className="flex flex-col items-center">
      <div className="mt-6 animate-[fadeSlideDown_0.3s_ease-out_both]">
        <GameOverlayBadge>
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              allSubmitted ? 'bg-emerald-400' : 'animate-pulse bg-amber-400',
            )}
          />
          {allSubmitted ? 'Bringing drawings to life...' : 'Waiting for players...'}
        </GameOverlayBadge>
      </div>

      <div className="mt-4 flex flex-1 items-center justify-center">
        {capturedImageUrl ? (
          <div
            className="animate-[scaleIn_0.4s_ease-out_both] rounded-2xl border-4 border-white/20 bg-white p-3 shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
            style={{ animationDelay: '0.1s' }}
          >
            <img
              src={capturedImageUrl}
              alt="Your drawing"
              className="max-h-64 max-w-xs rounded-lg object-contain"
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-white/10 px-8 py-6 text-white/60">Drawing submitted</div>
        )}
      </div>

      <div
        className="mb-8 flex gap-4 animate-[fadeSlideUp_0.35s_ease-out_both]"
        style={{ animationDelay: '0.15s' }}
      >
        <PlayerStatusList
          players={teammates}
          teamLabel={`Your Team (${myTeam === 'red' ? 'Red' : 'Blue'})`}
          teamColor={myTeam === 'red' ? 'text-red-300' : 'text-blue-300'}
          bgColor={myTeam === 'red' ? 'bg-red-900/50' : 'bg-blue-900/50'}
        />
        <PlayerStatusList
          players={opponents}
          teamLabel="Opponents"
          teamColor={myTeam === 'red' ? 'text-blue-300' : 'text-red-300'}
          bgColor={myTeam === 'red' ? 'bg-blue-900/50' : 'bg-red-900/50'}
        />
      </div>
    </GameOverlay>
  );
}
