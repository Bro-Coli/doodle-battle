import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Room } from '@colyseus/sdk';
import { getActiveRoom, leaveActiveRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { Icon } from '@/ui/icon/Icon';
import { NeonIcon } from '@/ui/icon/NeonIcon';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

interface PlayerSnapshot {
  name: string;
  team: string;
  ready: boolean;
}

type StatusVariant = 'default' | 'success' | 'warning';

type Status = { variant: StatusVariant; content: ReactNode } | null;

const START_STROKE: CSSProperties = { WebkitTextStroke: '6px #0f6b7f' };
const NOT_READY_STROKE: CSSProperties = { WebkitTextStroke: '6px #6e6a95' };

function getStatus({
  canStart,
  playerCount,
  teamsBalanced,
}: {
  canStart: boolean;
  playerCount: number;
  teamsBalanced: boolean;
}): Status {
  if (canStart) {
    return null;
  }
  if (playerCount < 2) {
    return null;
  }
  if (!teamsBalanced) {
    return {
      variant: 'warning',
      content: (
        <>
          <Icon name="arrowSwap" size={18} className="text-amber-200" decorative />
          <span>Teams must be even</span>
        </>
      ),
    };
  }
  return null;
}

export function WaitingRoomScreen(): React.JSX.Element {
  const room = getActiveRoom();

  const [players, setPlayers] = useState<Map<string, PlayerSnapshot>>(new Map());
  const [hostSessionId, setHostSessionId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [maxRounds, setMaxRounds] = useState(5);
  const [drawingTime, setDrawingTime] = useState(60);
  const [copied, setCopied] = useState(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!room) {
      navigate('/');
      return;
    }

    const phase = (room.state as { currentPhase?: string }).currentPhase;
    if (phase && phase !== 'idle') {
      leaveActiveRoom();
      navigate('/');
      return;
    }

    function takeSnapshot(): void {
      if (!room) return;
      const state = room.state as {
        players: Map<string, { name: string; team: string; ready: boolean }>;
        hostSessionId: string;
        maxPlayers: number;
        maxRounds: number;
        drawingTime: number;
      };

      const snap = new Map<string, PlayerSnapshot>();
      state.players?.forEach((p, sid) => {
        snap.set(sid, { name: p.name, team: p.team, ready: p.ready });
      });
      setPlayers(snap);
      setHostSessionId(state.hostSessionId);
      setMaxPlayers(state.maxPlayers ?? 8);
      setMaxRounds(state.maxRounds ?? 5);
      setDrawingTime(state.drawingTime ?? 60);
    }

    takeSnapshot();

    const onState = () => takeSnapshot();
    room.onStateChange(onState);

    const removeGameStarting = room.onMessage('game_starting', () => {
      navigate('/game');
    });

    cleanupRef.current = () => {
      room.onStateChange.remove(onState);
      removeGameStarting();
    };

    return () => cleanupRef.current?.();
  }, [room]);

  if (!room) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-white"
        style={{ background: 'var(--gradient-lobby)' }}
      >
        Redirecting...
      </div>
    );
  }

  const mySessionId = room.sessionId;
  const isHost = mySessionId === hostSessionId;
  const roomCode = room.roomId;

  const blueTeamPlayers: Array<[string, PlayerSnapshot]> = [];
  const redTeamPlayers: Array<[string, PlayerSnapshot]> = [];

  players.forEach((p, sid) => {
    if (p.team === 'blue') blueTeamPlayers.push([sid, p]);
    else redTeamPlayers.push([sid, p]);
  });

  const teamSlotCount = Math.max(1, Math.floor(maxPlayers / 2));
  const playerCount = players.size;
  const othersReady =
    playerCount >= 2 &&
    [...players.entries()].every(([sid, p]) => sid === hostSessionId || p.ready);
  const teamsBalanced = blueTeamPlayers.length === redTeamPlayers.length;
  const canStart = othersReady && teamsBalanced;

  function handleStartGame(): void {
    room?.send('start_game');
  }

  function handleCopyCode(): void {
    if (!roomCode) return;
    void navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleBack(): void {
    leaveActiveRoom();
    navigate('/');
  }

  const status = getStatus({ canStart, playerCount, teamsBalanced });

  return (
    <main
      className="ui-battle-page relative flex min-h-screen w-screen flex-col px-6 py-6"
      style={{ background: 'var(--gradient-lobby)' }}
    >
      {/* ─── Top bar ─── */}
      <div className="relative mb-6 flex items-center justify-center">
        <button
          type="button"
          onClick={handleBack}
          className="ui-icon-button ui-icon-button--sm absolute left-0 top-1/2 -translate-y-1/2 shrink-0"
          aria-label="Back to lobby"
        >
          <Icon name="arrowLeft" size={48} decorative />
        </button>

        {/* Centered title — same style as Create Room */}
        <div className="ui-create-room-title">
          <div className="ui-create-room-title__main">
            <span className="ui-create-room-title__orb" aria-hidden />
            <StrokeShadowText
              className="t60-eb sm:t48-eb"
              fillClassName="ui-create-room-title__text"
              fillStyle={{
                backgroundImage:
                  'linear-gradient(180deg, #ffffff 0%, #eef7ff 35%, #bfe4ff 72%, #8fd2ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              firstStrokeColor="#1a2555"
              secondStrokeColor="#2c5890"
              firstStrokeWidth={12}
              secondStrokeWidth={8}
              shadowOffsetY="0.32rem"
              deepShadowColor="rgba(20, 38, 92, 0.92)"
              deepShadowOffsetY="0.7rem"
              deepShadowStrokeWidth={12}
              deepShadowBlur="1px"
            >
              Waiting Room
            </StrokeShadowText>
          </div>
          <div className="ui-create-room-title__underline" aria-hidden>
            <span className="ui-create-room-title__underline-line" />
            <span className="ui-create-room-title__underline-gem" />
            <span className="ui-create-room-title__underline-line" />
          </div>
        </div>
      </div>

      {/* ─── Battle arena ─── */}
      <div className="flex flex-1 items-start justify-center mt-12">
        <div className="ui-waiting-room-layout grid w-full max-w-[1380px] items-start gap-6">
          <aside className="ui-waiting-room-sidebar flex flex-col gap-4">
            <div className="ui-command-card">
              <div className="relative z-1 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col leading-none">
                    <span className="t12-b font-nunito uppercase tracking-[0.18em] text-white/55">
                      Room Code
                    </span>
                    <span className="font-mono t28-eb tracking-[0.18em] text-white">
                      {roomCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="ui-invite-chip__copy"
                    aria-label="Copy room code"
                  >
                    <span className="font-nunito t12-b uppercase text-white">
                      {copied ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>

                <div className="ui-command-card__divider" />

                <div>
                  <p className="mb-3 t12-b font-nunito uppercase tracking-[0.22em] text-white/55">
                    Match Settings
                  </p>
                  <div className="ui-command-card__row">
                    <div className="flex items-center gap-2.5">
                      <Icon
                        name="user"
                        size={20}
                        color="#71bff0"
                        decorative
                        style={{ filter: 'drop-shadow(0 0 6px rgba(113,191,240,0.5))' }}
                      />
                      <span className="t14-b font-nunito uppercase tracking-wider text-white/70">
                        Players
                      </span>
                    </div>
                    <span className="font-mono t18-b text-white">
                      {playerCount}
                      <span className="text-white/45"> / {maxPlayers}</span>
                    </span>
                  </div>
                  <div className="ui-command-card__row">
                    <div className="flex items-center gap-2.5">
                      <Icon
                        name="trophy"
                        size={20}
                        color="#ffd56a"
                        decorative
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255,213,106,0.5))' }}
                      />
                      <span className="t14-b font-nunito uppercase tracking-wider text-white/70">
                        Rounds
                      </span>
                    </div>
                    <span className="font-mono t18-b text-white">{maxRounds}</span>
                  </div>
                  <div className="ui-command-card__row">
                    <div className="flex items-center gap-2.5">
                      <Icon
                        name="lightning"
                        size={20}
                        color="#b4ffea"
                        decorative
                        style={{ filter: 'drop-shadow(0 0 6px rgba(180,255,234,0.5))' }}
                      />
                      <span className="t14-b font-nunito uppercase tracking-wider text-white/70">
                        Draw Time
                      </span>
                    </div>
                    <span className="font-mono t18-b text-white">{drawingTime}s</span>
                  </div>
                </div>

                {status && (
                  <div
                    className={
                      'ui-status-chip ui-status-chip--lg justify-center font-nunito t16-b' +
                      (status.variant === 'success'
                        ? ' ui-status-chip--success'
                        : status.variant === 'warning'
                          ? ' ui-status-chip--warning'
                          : '')
                    }
                  >
                    {status.content}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="ui-waiting-room-arena">
            <div className="ui-waiting-room-arena__teams">
              <TeamColumn
                team="blue"
                label="Blue Team"
                players={blueTeamPlayers}
                slotCount={teamSlotCount}
                mySessionId={mySessionId}
                hostSessionId={hostSessionId}
              />

              <NeonIcon
                name="arrowSwap"
                size={56}
                color="currentColor"
                neonColor="#71bff0"
                neonIntensity={2}
              />

              <TeamColumn
                team="red"
                label="Red Team"
                players={redTeamPlayers}
                slotCount={teamSlotCount}
                mySessionId={mySessionId}
                hostSessionId={hostSessionId}
              />
            </div>

            <div className="ui-waiting-room-arena__action">
              {isHost ? (
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={handleStartGame}
                  className="ui-pill-button ui-pill-button--mint h-[80px] min-w-[320px] px-10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-1 inline-block">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-eb"
                      style={START_STROKE}
                    >
                      Start Game
                    </span>
                    <span className="relative text-center uppercase text-white t24-eb">
                      Start Game
                    </span>
                  </span>
                </button>
              ) : (
                <div className="w-full max-w-[380px]">
                  <ReadyButton room={room} isReady={players.get(mySessionId)?.ready ?? false} />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function TeamColumn({
  team,
  label,
  players,
  slotCount,
  mySessionId,
  hostSessionId,
}: {
  team: 'blue' | 'red';
  label: string;
  players: Array<[string, PlayerSnapshot]>;
  slotCount: number;
  mySessionId: string;
  hostSessionId: string;
}) {
  const filledCount = players.length;
  const readyCount = players.filter(([sid, p]) => sid === hostSessionId || p.ready).length;
  const progressPct = slotCount === 0 ? 0 : Math.round((readyCount / slotCount) * 100);

  return (
    <div
      className={
        'ui-team-panel ' + (team === 'blue' ? 'ui-team-panel--blue' : 'ui-team-panel--red')
      }
    >
      <span className="ui-team-panel__sheen" aria-hidden />
      <div className="relative">
        <div className="ui-team-panel__header">
          <span className="inline-flex items-center gap-2 t20-eb font-nunito uppercase tracking-wider text-white">
            <span
              className={
                'ui-team-dot ' + (team === 'blue' ? 'ui-team-dot--blue' : 'ui-team-dot--red')
              }
              aria-hidden
            />
            {label}
          </span>
          <span className="ui-team-panel__count font-mono t14-b">
            <span className="text-white tabular-nums">{filledCount}</span>
            <span className="text-white/40 tabular-nums">/{slotCount}</span>
          </span>
        </div>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: slotCount }).map((_, i) => {
            const entry = players[i];
            return (
              <TeamSlot
                key={entry ? entry[0] : `${team}-empty-${i}`}
                team={team}
                playerName={entry?.[1].name}
                isHost={entry ? entry[0] === hostSessionId : false}
                isMe={entry ? entry[0] === mySessionId : false}
                isReady={entry?.[1].ready}
              />
            );
          })}
        </ul>
        <div className="ui-team-panel__footer">
          <div className="ui-team-panel__progress" aria-hidden>
            <div
              className={
                'ui-team-panel__progress-fill ' +
                (team === 'blue'
                  ? 'ui-team-panel__progress-fill--blue'
                  : 'ui-team-panel__progress-fill--red')
              }
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="t12-b font-nunito uppercase tracking-[0.18em] text-white/55 tabular-nums">
            {readyCount}/{slotCount} ready
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ReadyButton({ room, isReady }: { room: Room; isReady: boolean }) {
  function toggle() {
    room.send('toggle_ready');
  }

  const label = isReady ? 'Cancel Ready' : 'Ready Up';

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        isReady
          ? 'ui-pill-button ui-pill-button--gray h-[80px] w-full'
          : 'ui-pill-button ui-pill-button--mint h-[80px] w-full'
      }
    >
      <span className="relative z-1 inline-block">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-eb"
          style={isReady ? NOT_READY_STROKE : START_STROKE}
        >
          {label}
        </span>
        <span className="relative text-center uppercase text-white t24-eb">{label}</span>
      </span>
    </button>
  );
}

function TeamSlot({
  team,
  playerName,
  isHost,
  isMe,
  isReady,
}: {
  team: 'blue' | 'red';
  playerName?: string;
  isHost: boolean;
  isMe: boolean;
  isReady?: boolean;
}) {
  if (!playerName) {
    return (
      <li
        className={
          'ui-team-slot ui-team-slot--lg ui-team-slot--empty font-nunito ' +
          (team === 'blue' ? 'ui-team-slot--empty-blue' : 'ui-team-slot--empty-red')
        }
      >
        <span className="relative z-2">Waiting...</span>
      </li>
    );
  }

  const slotClass =
    'ui-team-slot ui-team-slot--lg font-nunito ' +
    (team === 'blue' ? 'ui-team-slot--filled' : 'ui-team-slot--filled-red');

  return (
    <li className={slotClass}>
      <div className="flex min-w-0 flex-1 items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate t16-b text-white">{playerName}</span>
          <div className="flex items-center gap-1.5">
            {isHost && <span className="ui-host-badge">Host</span>}
            {isMe && (
              <span
                className="rounded-md px-1.5 py-0.5 font-black text-[0.66rem] tracking-[0.14em] uppercase"
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  color: 'white',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                You
              </span>
            )}
          </div>
        </div>
      </div>
      {isReady && (
        <Icon
          name="check"
          size={28}
          color="white"
          className="shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.55)]"
          decorative
        />
      )}
    </li>
  );
}
