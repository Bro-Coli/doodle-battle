import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';
import { GameOverlay, GameOverlayBadge, GameOverlayCard } from '@/ui/overlay/GameOverlay';
import { Icon } from '@/ui/icon/Icon';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

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

// Mirrors the team text treatment used on the scenario reveal screen:
// the team color only fills the "Blue"/"Red" word, while "Team" keeps
// stroke-only so the color word carries the identity.
const TEAM_TEXT_CFG = {
  blue: {
    label: 'Blue',
    fillStyle: {
      background: 'linear-gradient(to bottom, #FFFFFF 0%, #75ccf4 30%, #0692dd 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } as CSSProperties,
    firstStrokeColor: '#2469b7',
    secondStrokeColor: '#0D2E6E',
  },
  red: {
    label: 'Red',
    fillStyle: {
      background: 'linear-gradient(to bottom, #f9c0dc 0%, #ec83a6 40%, #C2185B 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } as CSSProperties,
    firstStrokeColor: '#880E4F',
    secondStrokeColor: '#4A0A2A',
  },
} as const;

function PlayerRoster({
  players,
  team,
  isMyTeam,
}: {
  players: PlayerSnapshot[];
  team: 'red' | 'blue';
  isMyTeam: boolean;
}): React.JSX.Element {
  const cfg = TEAM_TEXT_CFG[team];

  return (
    <GameOverlayCard variant={team} size="sm" className="w-full px-5 py-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="flex items-end gap-2">
          <StrokeShadowText
            className="t20-eb"
            fillStyle={cfg.fillStyle}
            firstStrokeColor={cfg.firstStrokeColor}
            secondStrokeColor={cfg.secondStrokeColor}
            firstStrokeWidth={5}
            secondStrokeWidth={4}
            shadowOffsetY="0.15rem"
          >
            {cfg.label}
          </StrokeShadowText>
          <StrokeShadowText
            className="t16-b"
            firstStrokeColor={cfg.firstStrokeColor}
            secondStrokeColor={cfg.secondStrokeColor}
            firstStrokeWidth={4}
            secondStrokeWidth={3}
            shadowOffsetY="0.1rem"
          >
            Team
          </StrokeShadowText>
        </p>
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
                'flex h-6 w-6 items-center justify-center shrink-0 transition',
                !p.hasSubmittedDrawing &&
                  'rounded-full bg-black/30 ring-1 ring-white/20 text-white/35 text-xs font-black',
              )}
            >
              {p.hasSubmittedDrawing ? (
                <Icon
                  name="check"
                  size={22}
                  color="emerald-300"
                  className="shrink-0 text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                  decorative
                />
              ) : (
                '•'
              )}
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

  return (
    <GameOverlay
      centered
      pointerEvents
      className="cursor-default bg-[radial-gradient(ellipse_at_center,rgba(20,10,55,0.55)_0%,rgba(8,4,30,0.78)_100%)] backdrop-blur-sm"
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
                {allSubmitted ? 'Game will start soon' : 'Waiting for players'}
              </span>
            </GameOverlayBadge>
          </div>

          <div
            className="flex flex-col gap-6 animate-[fadeSlideUp_0.4s_ease-out_both]"
            style={{ animationDelay: '0.2s' }}
          >
            <PlayerRoster players={teammates} team={myTeamKey} isMyTeam />
            <PlayerRoster players={opponents} team={oppTeamKey} isMyTeam={false} />
          </div>
        </div>
      </div>
    </GameOverlay>
  );
}
