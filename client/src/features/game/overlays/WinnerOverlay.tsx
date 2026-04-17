import type { CSSProperties } from 'react';
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

const CONFIRM_STROKE: CSSProperties & { '--stroke': string } = {
  '--stroke': '5px',
  WebkitTextStroke: 'var(--stroke) #0f6b7f',
};

const MENU_STROKE: CSSProperties & { '--stroke': string } = {
  '--stroke': '5px',
  WebkitTextStroke: 'var(--stroke) #52507a',
};

function CrownIcon({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 100 78" fill="none" aria-hidden>
      <defs>
        <linearGradient id="winner-crown" x1="50" y1="0" x2="50" y2="78">
          <stop offset="0%" stopColor="#FFFBC4" />
          <stop offset="40%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#D97700" />
        </linearGradient>
        <radialGradient id="winner-gem-red" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#FFD7DD" />
          <stop offset="50%" stopColor="#FF4F6E" />
          <stop offset="100%" stopColor="#A81236" />
        </radialGradient>
      </defs>
      <path
        d="M8 70 L14 18 L34 42 L50 6 L66 42 L86 18 L92 70 Z"
        fill="url(#winner-crown)"
        stroke="#5B3400"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <rect x="8" y="62" width="84" height="10" rx="3" fill="#F5A623" stroke="#5B3400" strokeWidth="3" />
      <circle cx="14" cy="18" r="5" fill="#FFF3A8" stroke="#5B3400" strokeWidth="2.5" />
      <circle cx="50" cy="6" r="5.5" fill="url(#winner-gem-red)" stroke="#5B3400" strokeWidth="2.5" />
      <circle cx="86" cy="18" r="5" fill="#FFF3A8" stroke="#5B3400" strokeWidth="2.5" />
    </svg>
  );
}

export function WinnerOverlay({
  winner,
  stats,
  mySessionId,
  onBackToLobby,
  onMainMenu,
}: WinnerOverlayProps): React.JSX.Element {
  const winnerLabel =
    winner === 'red' ? 'Red Team Wins' : winner === 'blue' ? 'Blue Team Wins' : 'Draw';

  const titleColor =
    winner === 'red' ? 'red' : winner === 'blue' ? 'blue' : ('victory' as const);

  const cardVariant =
    winner === 'red' ? 'red' : winner === 'blue' ? 'blue' : ('default' as const);

  const rows = Object.entries(stats).sort(([, a], [, b]) => {
    if (a.team !== b.team) return a.team < b.team ? -1 : 1;
    return b.kills - a.kills;
  });

  return (
    <GameOverlay
      centered
      pointerEvents
      className="bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.85)_100%)] backdrop-blur-md"
    >
      <GameOverlayCard
        variant={cardVariant}
        className="w-full max-w-xl animate-[scaleIn_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both] text-center"
      >
        {/* crown + sweep shimmer */}
        <div className="relative mx-auto mb-4 flex justify-center">
          <div className="hud-crown-float">
            <CrownIcon size={84} />
          </div>
        </div>

        <GameOverlayTitle className="mb-2" size="lg" color={titleColor}>
          {winnerLabel}
        </GameOverlayTitle>

        <p className="mb-7 font-nunito text-sm font-black tracking-[0.3em] uppercase text-white/55">
          — Match Complete —
        </p>

        <div className="mb-7 space-y-2 text-left">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-6 px-[1.4rem] pb-2 font-nunito text-[0.7rem] font-black tracking-[0.18em] uppercase text-white/45">
            <span>Player</span>
            <span className="text-right min-w-[3.2rem]">Drawn</span>
            <span className="text-right min-w-[3.2rem]">Alive</span>
            <span className="text-right min-w-[3.2rem]">Kills</span>
            <span className="w-0" />
          </div>
          {rows.map(([sessionId, stat], index) => {
            const isMe = sessionId === mySessionId;
            const teamCls =
              stat.team === 'red' ? 'ui-hud-row--red' : 'ui-hud-row--blue';
            return (
              <div
                key={sessionId}
                className={cn(
                  'ui-hud-row',
                  teamCls,
                  isMe && 'ui-hud-row--me',
                  'animate-[fadeSlideUp_0.4s_ease-out_both]',
                )}
                style={{ animationDelay: `${0.1 + index * 0.07}s` }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{
                      background:
                        stat.team === 'red'
                          ? 'radial-gradient(circle at 30% 30%, #FFE3E8 0%, #FF506E 45%, #C62142 100%)'
                          : 'radial-gradient(circle at 30% 30%, #DFF0FF 0%, #5AB2FF 45%, #1776D0 100%)',
                      boxShadow:
                        stat.team === 'red'
                          ? '0 0 8px var(--color-team-red-glow)'
                          : '0 0 8px var(--color-team-blue-glow)',
                    }}
                  />
                  <span
                    className={cn(
                      'truncate text-base',
                      isMe ? 'text-white font-black' : 'text-white/92 font-bold',
                    )}
                  >
                    {stat.name}
                  </span>
                  {isMe && (
                    <span
                      className="ml-1 shrink-0 rounded-md px-2 py-0.5 font-black text-[0.65rem] tracking-[0.14em] uppercase"
                      style={{
                        background:
                          'linear-gradient(180deg, #FFE788 0%, #FFC93C 55%, #E08A00 100%)',
                        color: '#4A2A00',
                        boxShadow:
                          'inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 0 rgba(80,44,0,0.5), 0 0 10px rgba(255,200,60,0.45)',
                      }}
                    >
                      You
                    </span>
                  )}
                </div>
                <span className="ui-hud-row__stat ui-hud-row__stat--muted">{stat.entitiesDrawn}</span>
                <span className="ui-hud-row__stat">{stat.entitiesSurviving}</span>
                <span className="ui-hud-row__stat ui-hud-row__stat--highlight">{stat.kills}</span>
                <span className="w-0" />
              </div>
            );
          })}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBackToLobby}
            className="ui-pill-button ui-pill-button--mint ui-pill-button--less-round flex-1 h-[60px]"
          >
            <span className="relative z-1 inline-block">
              <span
                aria-hidden
                className="t18-eb pointer-events-none absolute inset-0 text-center uppercase text-transparent"
                style={CONFIRM_STROKE}
              >
                Play Again
              </span>
              <span className="t18-eb relative text-center uppercase text-white">Play Again</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="ui-pill-button ui-pill-button--gray ui-pill-button--less-round flex-1 h-[60px]"
          >
            <span className="relative z-1 inline-block">
              <span
                aria-hidden
                className="t18-eb pointer-events-none absolute inset-0 text-center uppercase text-transparent"
                style={MENU_STROKE}
              >
                Main Menu
              </span>
              <span className="t18-eb relative text-center uppercase text-white">Main Menu</span>
            </span>
          </button>
        </div>
      </GameOverlayCard>
    </GameOverlay>
  );
}
