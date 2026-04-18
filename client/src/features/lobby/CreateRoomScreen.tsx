import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Room } from '@colyseus/sdk';
import { createRoom, getActiveRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { setDisplayName, useDisplayNameStore } from './displayNameStore';
import { Icon } from '@/ui/icon/Icon';
import { NeonIcon } from '@/ui/icon/NeonIcon';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

const MAX_PLAYER_OPTIONS = [2, 4, 6, 8] as const;
const ROUND_OPTIONS = [3, 5, 10] as const;

interface PlayerSnapshot {
  name: string;
  team: string;
  ready: boolean;
}

const START_STROKE: CSSProperties = { WebkitTextStroke: '6px #0f6b7f' };
const CREATE_STROKE: CSSProperties = { WebkitTextStroke: '6px #2c5890' };

export function CreateRoomScreen() {
  const storedDisplayName = useDisplayNameStore((s) => s.displayName);

  const [maxPlayers, setMaxPlayers] = useState(4);
  const [maxRounds, setMaxRounds] = useState(5);
  const [drawingTime, setDrawingTime] = useState(60);
  const [isPrivate, setIsPrivate] = useState(false);

  const [room, setRoom] = useState<Room | null>(getActiveRoom);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Map<string, PlayerSnapshot>>(new Map());
  const [hostSessionId, setHostSessionId] = useState('');

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const created = !!room && !!roomCode;
  const cleanupRef = useRef<(() => void) | null>(null);

  const syncRoomState = useCallback((r: Room) => {
    const state = r.state as {
      players: Map<string, { name: string; team: string; ready: boolean }>;
      hostSessionId: string;
    };
    const snap = new Map<string, PlayerSnapshot>();
    state.players?.forEach((p, sid) => {
      snap.set(sid, { name: p.name, team: p.team, ready: p.ready });
    });
    setPlayers(snap);
    setHostSessionId(state.hostSessionId);
  }, []);

  useEffect(() => {
    if (!room) return;

    syncRoomState(room);

    const onState = () => syncRoomState(room);
    room.onStateChange(onState);

    const removeGameStarting = room.onMessage('game_starting', () => {
      navigate('/game');
    });

    cleanupRef.current = () => {
      room.onStateChange.remove(onState);
      removeGameStarting();
    };

    return () => cleanupRef.current?.();
  }, [room, syncRoomState]);

  async function handleCreateRoom(): Promise<void> {
    const name = storedDisplayName.trim();
    if (!name) {
      setError('Please set your display name first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newRoom = await createRoom({ name, maxPlayers, maxRounds, drawingTime, isPrivate });
      setDisplayName(name);
      setRoom(newRoom);
      setRoomCode(newRoom.roomId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  }

  function handleStartGame(): void {
    if (!room) return;
    room.send('start_game');
  }

  function handleCopyCode(): void {
    if (!roomCode) return;
    void navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const mySessionId = room?.sessionId ?? '';
  const isHost = mySessionId === hostSessionId;
  const teamAPlayers: Array<[string, PlayerSnapshot]> = [];
  const teamBPlayers: Array<[string, PlayerSnapshot]> = [];

  players.forEach((p, sid) => {
    if (p.team === 'blue') teamBPlayers.push([sid, p]);
    else teamAPlayers.push([sid, p]);
  });

  const othersReady =
    players.size >= 2 &&
    [...players.entries()].every(([sid, p]) => sid === hostSessionId || p.ready);
  const teamsBalanced = teamAPlayers.length === teamBPlayers.length;
  const canStart = othersReady && teamsBalanced;
  const teamSlotCount = maxPlayers / 2;

  return (
    <main
      className="relative flex min-h-screen w-screen flex-col items-center overflow-y-auto px-6 py-8"
      style={{ background: 'var(--gradient-lobby)' }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="ui-icon-button ui-icon-button--sm absolute top-6 left-6 z-10"
        aria-label="Back to lobby"
      >
        <Icon name="arrowLeft" size={48} decorative />
      </button>

      {/* Title */}
      <div className="ui-create-room-title mb-12">
        <div className="ui-create-room-title__main">
          <span className="ui-create-room-title__orb" aria-hidden />
          <StrokeShadowText
            className="t60-eb sm:t48-eb"
            fillClassName="ui-create-room-title__text"
            fillStyle={{
              backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #eef7ff 35%, #bfe4ff 72%, #8fd2ff 100%)',
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
            Create Room
          </StrokeShadowText>
        </div>
        <div className="ui-create-room-title__underline" aria-hidden>
          <span className="ui-create-room-title__underline-line" />
          <span className="ui-create-room-title__underline-gem" />
          <span className="ui-create-room-title__underline-line" />
        </div>
      </div>

      {/* Content */}
      <div className="flex w-full max-w-[1320px] flex-1 items-start gap-12">
        {/* Left: Settings panel */}
        <div className="ui-glass-panel w-[400px] shrink-0">
          {/* Max Players */}
          <div className="mb-8">
            <p className="mb-3 t14-b font-nunito text-center uppercase tracking-widest text-white/70">
              Max Players
            </p>
            <GlossySelect
              value={maxPlayers}
              options={MAX_PLAYER_OPTIONS.map((n) => ({ value: n, label: `${n} Players` }))}
              onChange={setMaxPlayers}
              accent="cyan"
              disabled={created}
            />
          </div>

          {/* Round Limit */}
          <div className="mb-8">
            <p className="mb-3 t14-b font-nunito text-center uppercase tracking-widest text-white/70">
              Round Limit
            </p>
            <GlossySelect
              value={maxRounds}
              options={ROUND_OPTIONS.map((n) => ({ value: n, label: `${n} Rounds` }))}
              onChange={setMaxRounds}
              accent="pink"
              disabled={created}
            />
          </div>

          {/* Drawing Time */}
          <div className="mb-8">
            <p className="mb-3 t14-b font-nunito text-center uppercase tracking-widest text-white/70">
              Drawing Time
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={600}
                step={10}
                value={drawingTime}
                onChange={(e) => setDrawingTime(Number(e.target.value))}
                disabled={created}
                className="ui-glossy-slider flex-1 disabled:opacity-50"
                style={
                  {
                    '--slider-pct': `${((drawingTime - 10) / (120 - 10)) * 100}%`,
                  } as React.CSSProperties
                }
              />
              <span
                className={
                  'relative inline-flex w-[118px] shrink-0 items-center justify-end' +
                  (created ? ' opacity-50' : '')
                }
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 text-right font-nunito t18-b text-transparent"
                  style={{ WebkitTextStroke: '5px rgba(30, 15, 70, 0.55)' }}
                >
                  {drawingTime} sec
                </span>
                <span className="relative text-right font-nunito t18-b text-white">
                  {drawingTime} sec
                </span>
              </span>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <p className="mb-3 t14-b font-nunito text-center uppercase tracking-widest text-white/70">
              Visibility
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={created}
                onClick={() => setIsPrivate(true)}
                className={
                  'ui-toggle-btn flex-1 font-nunito' +
                  (isPrivate ? ' ui-toggle-btn--active-gray' : ' ui-toggle-btn--inactive') +
                  (created ? ' opacity-50' : '')
                }
              >
                <span className="relative z-1 inline-block">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t16-b"
                    style={{
                      WebkitTextStroke: isPrivate ? '4px #6e6a95' : '4px rgba(100,95,140,0.4)',
                    }}
                  >
                    Private
                  </span>
                  <span
                    className={
                      'relative text-center uppercase t16-b ' +
                      (isPrivate ? 'text-white' : 'text-white/50')
                    }
                  >
                    Private
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={created}
                onClick={() => setIsPrivate(false)}
                className={
                  'ui-toggle-btn flex-1 font-nunito' +
                  (!isPrivate ? ' ui-toggle-btn--active-cyan' : ' ui-toggle-btn--inactive') +
                  (created ? ' opacity-50' : '')
                }
              >
                <span className="relative z-1 inline-block">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t16-b"
                    style={{
                      WebkitTextStroke: !isPrivate ? '4px #1a8a9a' : '4px rgba(100,95,140,0.4)',
                    }}
                  >
                    Public
                  </span>
                  <span
                    className={
                      'relative text-center uppercase t16-b ' +
                      (!isPrivate ? 'text-white' : 'text-white/50')
                    }
                  >
                    Public
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Invite Code — only visible after room creation */}
          {created && (
            <div className="text-center mt-6">
              <p className="mb-2 t12-b font-nunito uppercase tracking-widest text-white/60">
                Invite Code
              </p>
              <div className="ui-invite-code-bar">
                <span className="relative z-1 inline-flex items-center">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 font-mono t28-eb tracking-[0.15em] text-transparent"
                    style={{ WebkitTextStroke: '5px rgba(30, 15, 70, 0.7)' }}
                  >
                    {roomCode}
                  </span>
                  <span className="relative font-mono t28-eb tracking-[0.15em] text-white">
                    {roomCode}
                  </span>
                </span>
                <button type="button" onClick={handleCopyCode} className="ui-invite-copy-btn">
                  <span className="relative font-nunito t12-b uppercase text-white/90">
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Create Room button — under settings panel */}
          {!created && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleCreateRoom()}
              className="ui-pill-button mt-12 h-[72px] w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative z-1 inline-block">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t20-eb"
                  style={CREATE_STROKE}
                >
                  {loading ? 'Creating…' : 'Create Room'}
                </span>
                <span className="relative text-center uppercase text-white t20-eb">
                  {loading ? 'Creating…' : 'Create Room'}
                </span>
              </span>
            </button>
          )}
        </div>

        {/* Right: Teams + Action */}
        <div className="flex flex-1 flex-col items-center">
          {!created ? (
            <div className="ui-team-area flex w-full min-h-[400px] items-center justify-center">
              <p className="t24-b font-nunito text-center text-white/40">
                Please create a room to get started!
              </p>
            </div>
          ) : (
            <div className="ui-team-area ui-team-area--filled w-full">
              {/* Team headers */}
              <div className="mb-4 flex w-full items-center">
                <div className="flex-1 text-center">
                  <span className="inline-flex items-center gap-2 t18-b font-nunito uppercase tracking-wider text-white">
                    <span className="ui-team-dot ui-team-dot--blue" aria-hidden />
                    Blue Team
                  </span>
                </div>
                <div className="w-12" />
                <div className="flex-1 text-center">
                  <span className="inline-flex items-center gap-2 t18-b font-nunito uppercase tracking-wider text-white">
                    <span className="ui-team-dot ui-team-dot--red" aria-hidden />
                    Red Team
                  </span>
                </div>
              </div>

              {/* Team columns */}
              <div className="flex w-full gap-3">
                {/* Team A */}
                <div className="flex flex-1 flex-col gap-4">
                  {Array.from({ length: teamSlotCount }).map((_, i) => {
                    const entry = teamAPlayers[i];
                    return (
                      <TeamSlot
                        key={entry ? entry[0] : `a-empty-${i}`}
                        playerName={entry?.[1].name}
                        isHost={entry ? entry[0] === hostSessionId : false}
                        isMe={entry ? entry[0] === mySessionId : false}
                        isReady={entry?.[1].ready}
                      />
                    );
                  })}
                </div>

                {/* Swap icon */}
                <div className="flex items-center justify-center">
                  <NeonIcon
                    name="arrowSwap"
                    size={48}
                    color="currentColor"
                    neonColor="#71bff0"
                    neonIntensity={2}
                  />
                </div>

                {/* Team B */}
                <div className="flex flex-1 flex-col gap-4">
                  {Array.from({ length: teamSlotCount }).map((_, i) => {
                    const entry = teamBPlayers[i];
                    return (
                      <TeamSlot
                        key={entry ? entry[0] : `b-empty-${i}`}
                        playerName={entry?.[1].name}
                        isHost={entry ? entry[0] === hostSessionId : false}
                        isMe={entry ? entry[0] === mySessionId : false}
                        isReady={entry?.[1].ready}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Status text */}
              <div className="mt-6 text-center font-nunito t16-b text-white/50">
                {players.size < 2 && (
                  <p>
                    Share the code <span className="font-mono text-white/80">{roomCode}</span> with
                    friends to join!
                  </p>
                )}
                {players.size >= 2 && !othersReady && <p>Waiting for all players to ready up…</p>}
                {players.size >= 2 && othersReady && !teamsBalanced && (
                  <p>Teams must have an even number of players…</p>
                )}
                {canStart && (
                  <p className="text-emerald-300">All players ready — start the game!</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-500/20 px-5 py-2.5 t14-b font-nunito text-red-300">
              {error}
            </p>
          )}

          {/* Start Game / Ready — only after room created */}
          {created && (
            <div className="mt-6 flex items-center gap-4">
              {isHost && (
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={handleStartGame}
                  className="ui-pill-button ui-pill-button--mint h-[88px] w-[400px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-1 inline-block">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t28-eb"
                      style={START_STROKE}
                    >
                      Start Game
                    </span>
                    <span className="relative text-center uppercase text-white t28-eb">
                      Start Game
                    </span>
                  </span>
                </button>
              )}
              {!isHost && (
                <ReadyButton room={room} isReady={players.get(mySessionId)?.ready ?? false} />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ── Sub-components ── */

function ReadyButton({ room, isReady }: { room: Room; isReady: boolean }) {
  function toggle() {
    room.send('toggle_ready');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        isReady
          ? 'ui-pill-button ui-pill-button--mint h-[88px] w-[400px]'
          : 'ui-pill-button ui-pill-button--gray h-[88px] w-[400px]'
      }
    >
      <span className="relative z-1 inline-block">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t28-eb"
          style={isReady ? START_STROKE : ({ WebkitTextStroke: '6px #6e6a95' } as CSSProperties)}
        >
          {isReady ? 'Ready!' : 'Ready Up'}
        </span>
        <span className="relative text-center uppercase text-white t28-eb">
          {isReady ? 'Ready!' : 'Ready Up'}
        </span>
      </span>
    </button>
  );
}

function GlossySelect<T extends number>({
  value,
  options,
  onChange,
  accent,
  disabled = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  accent: 'cyan' | 'pink';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={
          'ui-glossy-select-trigger font-nunito' +
          (accent === 'cyan'
            ? ' ui-glossy-select-trigger--cyan'
            : ' ui-glossy-select-trigger--pink')
        }
      >
        <span className="relative z-1">{selected?.label}</span>
        <span
          className={
            'pointer-events-none absolute top-1/2 right-4 z-1 -translate-y-1/2' +
            (accent === 'cyan' ? ' text-[#3ecad6]' : ' text-[#c8687e]')
          }
        >
          <HeartIcon />
        </span>
      </button>

      {open && (
        <div className="ui-glossy-dropdown font-nunito">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={
                'ui-glossy-dropdown-item' +
                (opt.value === value ? ' ui-glossy-dropdown-item--active' : '')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="currentColor">
      <path d="M9 15.3l-1.45-1.32C3.1 9.84 0 7.06 0 3.64 0 1.63 1.58 0 3.56 0c1.12 0 2.2.52 2.94 1.36L9 4.1l2.5-2.74C12.24.52 13.32 0 14.44 0 16.42 0 18 1.63 18 3.64c0 3.42-3.1 6.2-7.55 10.34L9 15.3z" />
    </svg>
  );
}

function TeamSlot({
  playerName,
  isMe,
  isReady,
}: {
  playerName?: string;
  isHost: boolean;
  isMe: boolean;
  isReady?: boolean;
}) {
  if (!playerName) {
    return (
      <div className="ui-team-slot ui-team-slot--empty font-nunito">
        <span className="relative z-2">Waiting...</span>
      </div>
    );
  }

  return (
    <div className="ui-team-slot ui-team-slot--filled font-nunito">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate t16-b">{playerName}</span>
        {isMe && (
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 font-black text-[0.72rem] tracking-[0.14em] uppercase"
            style={{
              background: 'linear-gradient(180deg, #FFE788 0%, #FFC93C 55%, #E08A00 100%)',
              color: '#4A2A00',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 0 rgba(80,44,0,0.5), 0 0 10px rgba(255,200,60,0.45)',
            }}
          >
            You
          </span>
        )}
      </div>
      {isReady && (
        <Icon
          name="check"
          size={32}
          color="emerald-300"
          className="shrink-0 text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
          decorative
        />
      )}
    </div>
  );
}
