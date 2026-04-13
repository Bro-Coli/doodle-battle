import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Room } from '@colyseus/sdk';
import { createRoom, getActiveRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { setDisplayName, useDisplayNameStore } from './displayNameStore';
import { Icon } from '@/ui/icon/Icon';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

const MAX_PLAYER_OPTIONS = [2, 4, 6, 8] as const;
const ROUND_OPTIONS = [3, 5, 10] as const;
const TEAM_SLOT_COUNT = 4;

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
      const newRoom = await createRoom({ name, maxPlayers, maxRounds, isPrivate });
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

  const allReady = players.size >= 2 && [...players.values()].every((p) => p.ready);

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
      <div className="mb-8">
        <StrokeShadowText
          className="t48-eb uppercase sm:t38-eb"
          firstStrokeColor="#1a2555"
          secondStrokeColor="#2c5890"
          firstStrokeWidth={10}
          secondStrokeWidth={10}
        >
          Create Room
        </StrokeShadowText>
      </div>

      {/* Content */}
      <div className="flex w-full max-w-[1200px] flex-1 items-start gap-12">
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
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={120}
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
              <span className="relative inline-flex w-[120px] shrink-0 items-center justify-end">
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
          <div className="ui-team-area w-full">
            {/* Team headers */}
            <div className="mb-4 flex w-full items-center">
              <div className="flex-1 text-center">
                <span className="inline-flex items-center gap-2 t18-b font-nunito uppercase tracking-wider text-white">
                  <span className="inline-block h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                  Team A
                </span>
              </div>
              <div className="w-12" />
              <div className="flex-1 text-center">
                <span className="inline-flex items-center gap-2 t18-b font-nunito uppercase tracking-wider text-white">
                  <span className="inline-block h-3.5 w-3.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                  Team B
                </span>
              </div>
            </div>

            {/* Team columns */}
            <div className="flex w-full gap-3">
              {/* Team A */}
              <div className="flex flex-1 flex-col gap-3">
                {Array.from({ length: TEAM_SLOT_COUNT }).map((_, i) => {
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <SwapIcon />
                </div>
              </div>

              {/* Team B */}
              <div className="flex flex-1 flex-col gap-3">
                {Array.from({ length: TEAM_SLOT_COUNT }).map((_, i) => {
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
              {!created && <p>Configure settings and create the room!</p>}
              {created && players.size < 2 && (
                <p>
                  Share the code <span className="font-mono text-white/80">{roomCode}</span> with
                  friends to join!
                </p>
              )}
              {created && players.size >= 2 && !allReady && (
                <p>Waiting for all players to ready up…</p>
              )}
              {created && allReady && (
                <p className="text-emerald-300">All players ready — start the game!</p>
              )}
            </div>
          </div>

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
                  disabled={!allReady}
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

function SwapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/50">
      <path
        d="M6 14L2 10L6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 6L18 10L14 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 10H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TeamSlot({
  playerName,
  isHost,
  isMe,
  isReady,
}: {
  playerName?: string;
  isHost: boolean;
  isMe: boolean;
  isReady?: boolean;
}) {
  if (!playerName) {
    return <div className="ui-team-slot ui-team-slot--empty font-nunito">Waiting...</div>;
  }

  return (
    <div
      className={
        'ui-team-slot ui-team-slot--filled font-nunito' + (isMe ? ' ring-2 ring-white/40' : '')
      }
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-blue-300 to-blue-500 text-sm">
        <span>😊</span>
        {isHost && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">👑</span>}
      </div>
      <span className="truncate t16-b">{playerName}</span>
      {isReady && (
        <span className="ml-auto text-emerald-400">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
}
