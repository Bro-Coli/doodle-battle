import { cn } from '@/shared/lib/cn';
import { GameOverlay, GameOverlayCard, GameOverlayTitle } from '@/ui/overlay/GameOverlay';

type PlayerStat = {
  name: string;
  team: string;
  entitiesDrawn: number;
  entitiesSurviving: number;
  kills: number;
};

type WinnerOverlayProps = {
  winner: string;
  stats: Record<string, PlayerStat>;
  mySessionId: string;
  onBackToLobby: () => void;
  onMainMenu: () => void;
};

export function WinnerOverlay({
  winner,
  stats,
  mySessionId,
  onBackToLobby,
  onMainMenu,
}: WinnerOverlayProps): React.JSX.Element {
  const winnerLabel =
    winner === 'red' ? 'Red Team Wins!' : winner === 'blue' ? 'Blue Team Wins!' : "It's a Draw!";

  const winnerColor =
    winner === 'red' ? 'red' : winner === 'blue' ? 'blue' : ('yellow' as const);

  const rows = Object.entries(stats).sort(([, a], [, b]) => {
    if (a.team !== b.team) return a.team < b.team ? -1 : 1;
    return b.kills - a.kills;
  });

  return (
    <GameOverlay centered pointerEvents className="bg-black/50 backdrop-blur-sm">
      <GameOverlayCard
        variant="solid"
        className="w-full max-w-lg animate-[scaleIn_0.5s_ease-out_both]"
      >
        <GameOverlayTitle color={winnerColor} className="mb-6">
          {winnerLabel}
        </GameOverlayTitle>

        <div className="mb-8 overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest text-white/50">
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-right">Drawn</th>
                <th className="px-4 py-3 text-right">Alive</th>
                <th className="px-4 py-3 text-right">Kills</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([sessionId, stat], index) => {
                const isMe = sessionId === mySessionId;
                const teamColor = stat.team === 'red' ? 'text-red-400' : 'text-blue-400';
                return (
                  <tr
                    key={sessionId}
                    className={cn(
                      'border-b border-white/5 transition-colors',
                      isMe && 'bg-white/10',
                      'animate-[fadeSlideUp_0.3s_ease-out_both]',
                    )}
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <td className="px-4 py-3 text-white">
                      <span className={cn(isMe && 'font-bold')}>{stat.name}</span>
                      {isMe && (
                        <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs text-white/70">
                          you
                        </span>
                      )}
                    </td>
                    <td className={cn('px-4 py-3 capitalize font-medium', teamColor)}>
                      {stat.team}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/80">
                      {stat.entitiesDrawn}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/80">
                      {stat.entitiesSurviving}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-white">
                      {stat.kills}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBackToLobby}
            className="ui-pill-button ui-pill-button--less-round flex-1 h-14"
          >
            <span className="relative z-1 t16-eb uppercase text-white">Back to Lobby</span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="ui-pill-button ui-pill-button--gray ui-pill-button--less-round flex-1 h-14"
          >
            <span className="relative z-1 t16-eb uppercase text-white/90">Main Menu</span>
          </button>
        </div>
      </GameOverlayCard>
    </GameOverlay>
  );
}
