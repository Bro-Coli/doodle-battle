import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { getActiveRoom, leaveActiveRoom } from '@/network/ColyseusClient';
import { navigate } from '@/utils/navigate';

import { DefeatResultPage } from './DefeatResultPage';
import { VictoryResultPage } from './VictoryResultPage';
import {
  clearMatchResult,
  loadMatchResult,
  type MatchResultPayload,
  type MatchResultPlayerStat,
} from './matchResultStorage';

const PLAY_AGAIN_STROKE: CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #0f6b7f',
};

const MENU_STROKE: CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #6e6a95',
};

const TEAM_LABEL: Record<'red' | 'blue', string> = {
  red: 'Red Team',
  blue: 'Blue Team',
};

const TEAM_VARIANT: Record<'red' | 'blue', 'pink' | 'blue'> = {
  red: 'pink',
  blue: 'blue',
};

function StatsPanel({
  rows,
  mySessionId,
}: {
  rows: [string, MatchResultPlayerStat][];
  mySessionId: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'relative mt-14 w-full max-w-3xl rounded-2xl px-6 pb-5 pt-4',
        'bg-black/28 ring-1 ring-white/18 backdrop-blur-[3px]',
        'animate-[fadeSlideUp_0.5s_ease-out_both]',
      )}
      style={{ animationDelay: '0.35s' }}
    >
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-[1.2rem] pb-2 font-nunito text-[0.68rem] font-black tracking-[0.18em] uppercase text-white/55">
        <span>Player</span>
        <span className="text-right min-w-[3.2rem]">Drawn</span>
        <span className="text-right min-w-[3.2rem]">Alive</span>
        <span className="text-right min-w-[3.2rem]">Kills</span>
      </div>

      <div className="space-y-2">
        {rows.map(([sessionId, stat], index) => {
          const isMe = sessionId === mySessionId;
          const teamCls = stat.team === 'red' ? 'ui-hud-row--red' : 'ui-hud-row--blue';
          return (
            <div
              key={sessionId}
              className={cn(
                'ui-hud-row',
                teamCls,
                isMe && 'ui-hud-row--me',
                'animate-[fadeSlideUp_0.4s_ease-out_both]',
              )}
              style={{
                gridTemplateColumns: '1fr auto auto auto',
                animationDelay: `${0.45 + index * 0.06}s`,
              }}
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
              <span className="ui-hud-row__stat ui-hud-row__stat--muted">
                {stat.entitiesDrawn}
              </span>
              <span className="ui-hud-row__stat">{stat.entitiesSurviving}</span>
              <span className="ui-hud-row__stat ui-hud-row__stat--highlight">{stat.kills}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  stroke,
  variant,
  onClick,
}: {
  label: string;
  stroke: CSSProperties & { '--stroke': string };
  variant: 'mint' | 'gray';
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'ui-pill-button ui-pill-button--less-round h-24 w-[400px]',
        variant === 'mint' ? 'ui-pill-button--mint' : 'ui-pill-button--gray',
      )}
    >
      <span className="relative inline-block">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-eb sm:t18-eb"
          style={stroke}
        >
          {label}
        </span>
        <span className="relative text-center uppercase text-white t24-eb sm:t18-eb">
          {label}
        </span>
      </span>
    </button>
  );
}

function computeTeamScores(
  stats: Record<string, MatchResultPlayerStat>,
): { red: number; blue: number } {
  let red = 0;
  let blue = 0;
  Object.values(stats).forEach((stat) => {
    if (stat.team === 'red') red += stat.entitiesSurviving;
    else if (stat.team === 'blue') blue += stat.entitiesSurviving;
  });
  return { red, blue };
}

export function MatchResultScreen(): React.JSX.Element | null {
  const [payload, setPayload] = useState<MatchResultPayload | null>(() => loadMatchResult());

  // When a button is pressed we take over routing AND room lifecycle ourselves,
  // so the unmount cleanup shouldn't also try to leave the room (Play Again
  // needs the room to stay alive so `/waiting` can pick it up).
  const intentionalStayRef = useRef(false);

  useEffect(() => {
    if (!payload) {
      navigate('/');
    }
  }, [payload]);

  // Safety net: if the user navigates away from the result page without
  // using an in-page button (back button, typed URL, closed tab), drop the
  // Colyseus room so we don't leak connections.
  useEffect(() => {
    return () => {
      clearMatchResult();
      if (!intentionalStayRef.current) {
        leaveActiveRoom();
      }
    };
  }, []);

  if (!payload) return null;

  const { winner, stats, mySessionId } = payload;
  const mySessionStat = stats[mySessionId];
  const myTeamKey: 'red' | 'blue' = mySessionStat?.team === 'blue' ? 'blue' : 'red';
  const oppTeamKey: 'red' | 'blue' = myTeamKey === 'red' ? 'blue' : 'red';

  const teamScore = computeTeamScores(stats);

  const myTeamSlot = {
    label: TEAM_LABEL[myTeamKey],
    variant: TEAM_VARIANT[myTeamKey],
    score: teamScore[myTeamKey],
  };
  const oppTeamSlot = {
    label: TEAM_LABEL[oppTeamKey],
    variant: TEAM_VARIANT[oppTeamKey],
    score: teamScore[oppTeamKey],
  };

  const isVictory = winner === myTeamKey;

  const rows = Object.entries(stats).sort(([, a], [, b]) => {
    if (a.team !== b.team) return a.team === myTeamKey ? -1 : 1;
    return b.kills - a.kills;
  });

  const statsPanel = <StatsPanel rows={rows} mySessionId={mySessionId} />;

  function handlePlayAgain(): void {
    intentionalStayRef.current = true;
    const room = getActiveRoom();
    room?.send('return_to_lobby');
    setPayload(null);
    navigate('/waiting');
  }

  function handleMainMenu(): void {
    intentionalStayRef.current = true;
    leaveActiveRoom();
    setPayload(null);
    navigate('/');
  }

  return (
    <main className="relative flex min-h-screen w-screen flex-col overflow-hidden bg-[#120c2d] px-6 py-8">
      {isVictory ? (
        <VictoryResultPage myTeam={myTeamSlot} oppTeam={oppTeamSlot}>
          {statsPanel}
        </VictoryResultPage>
      ) : (
        <DefeatResultPage myTeam={myTeamSlot} oppTeam={oppTeamSlot}>
          {statsPanel}
        </DefeatResultPage>
      )}

      <div className="relative mt-12 flex-center gap-8 pb-12">
        <ActionButton
          label="Main Menu"
          stroke={MENU_STROKE}
          variant="gray"
          onClick={handleMainMenu}
        />
        <ActionButton
          label="Play Again"
          stroke={PLAY_AGAIN_STROKE}
          variant="mint"
          onClick={handlePlayAgain}
        />
      </div>
    </main>
  );
}
