import { cn } from '@/shared/lib/cn';
import { GameOverlay, GameOverlayBadge, GameOverlayCard } from '@/ui/overlay/GameOverlay';

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

function PlayerRoster({
  players,
  teamLabel,
  team,
  isMyTeam,
}: {
  players: PlayerSnapshot[];
  teamLabel: string;
  team: 'red' | 'blue';
  isMyTeam: boolean;
}): React.JSX.Element {
  const dot =
    team === 'red'
      ? 'radial-gradient(circle at 30% 30%, #FFE3E8 0%, #FF506E 45%, #C62142 100%)'
      : 'radial-gradient(circle at 30% 30%, #DFF0FF 0%, #5AB2FF 45%, #1776D0 100%)';
  const dotGlow =
    team === 'red' ? '0 0 8px var(--color-team-red-glow)' : '0 0 8px var(--color-team-blue-glow)';

  return (
    <GameOverlayCard variant={team} size="sm" className="w-full px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: dot, boxShadow: dotGlow }}
          />
          <span className="font-nunito text-[0.72rem] font-black tracking-[0.18em] uppercase text-white/90">
            {teamLabel}
          </span>
        </div>
        {isMyTeam && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 font-nunito text-[0.62rem] font-black tracking-[0.16em] uppercase text-white">
            You
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {players.map((p) => (
          <li
            key={p.name}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition',
              p.hasSubmittedDrawing ? 'bg-white/10' : 'bg-black/20 ring-1 ring-white/8',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-xs font-black transition',
                p.hasSubmittedDrawing
                  ? 'bg-[linear-gradient(180deg,#A5F3B3_0%,#2FCC71_100%)] text-[#0A3820] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_10px_rgba(80,220,140,0.5)]'
                  : 'bg-black/30 ring-1 ring-white/20 text-white/35',
              )}
            >
              {p.hasSubmittedDrawing ? '✓' : '•'}
            </span>
            <span
              className={cn(
                'font-nunito text-sm font-bold truncate',
                p.hasSubmittedDrawing ? 'text-white' : 'text-white/55',
              )}
            >
              {p.name}
            </span>
          </li>
        ))}
        {players.length === 0 && (
          <li className="font-nunito text-xs font-bold text-white/40">No players</li>
        )}
      </ul>
    </GameOverlayCard>
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
    if (p.team === myTeam) teammates.push(p);
    else opponents.push(p);
    if (!p.hasSubmittedDrawing) allSubmitted = false;
  });

  const myTeamKey = myTeam === 'red' ? 'red' : 'blue';
  const oppTeamKey = myTeam === 'red' ? 'blue' : 'red';
  const myLabel = myTeam === 'red' ? 'Red Team' : 'Blue Team';
  const oppLabel = myTeam === 'red' ? 'Blue Team' : 'Red Team';

  return (
    <GameOverlay
      centered
      className="bg-[radial-gradient(ellipse_at_center,rgba(20,10,55,0.55)_0%,rgba(8,4,30,0.78)_100%)] backdrop-blur-sm"
    >
      <div className="flex items-end justify-center gap-14 lg:gap-10 px-6">
        {/* LEFT — player's creation polaroid */}
        <div
          className="animate-[scaleIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={{ animationDelay: '0.12s' }}
        >
          {capturedImageUrl ? (
            <div className="ui-hud-polaroid">
              <span className="ui-hud-polaroid__tape" aria-hidden />
              <img
                src={capturedImageUrl}
                alt="Your drawing"
                className="relative z-1 block h-[320px] w-[320px] rounded-md object-contain bg-white"
              />
              <p className="ui-hud-polaroid__caption">Your Creation</p>
            </div>
          ) : (
            <div className="ui-hud-card flex h-[380px] w-[360px] items-center justify-center px-8 py-6 text-white/70 font-nunito font-bold">
              Drawing submitted
            </div>
          )}
        </div>

        {/* RIGHT — status badge + team rosters (anchored to bottom) */}
        <div className="flex flex-col justify-end items-stretch w-[360px] self-stretch">
          <div className="flex justify-center mb-8 animate-[slideDownFade_0.35s_ease-out_both]">
            <GameOverlayBadge>
              <span className="font-nunito text-[1.05rem] font-black tracking-[0.08em] text-white uppercase">
                {allSubmitted ? 'Bringing drawings to game' : 'Waiting for players'}
              </span>
            </GameOverlayBadge>
          </div>

          <div
            className="flex flex-col gap-6 animate-[fadeSlideUp_0.4s_ease-out_both]"
            style={{ animationDelay: '0.2s' }}
          >
            <PlayerRoster players={teammates} teamLabel={myLabel} team={myTeamKey} isMyTeam />
            <PlayerRoster
              players={opponents}
              teamLabel={oppLabel}
              team={oppTeamKey}
              isMyTeam={false}
            />
          </div>
        </div>
      </div>
    </GameOverlay>
  );
}
