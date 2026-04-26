import { useEffect, useState, type CSSProperties } from 'react';
import { joinByCode, listJoinableRooms, type JoinableRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { useDisplayNameStore } from './displayNameStore';
import { Icon } from '@/ui/icon/Icon';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

const ROOMS_POLL_INTERVAL_MS = 3000;

const JOIN_STROKE: CSSProperties = { WebkitTextStroke: '6px #0f6b7f' };
const SECTION_STROKE: CSSProperties = { WebkitTextStroke: '4px #1a2555' };

export function JoinRoomScreen() {
  const storedDisplayName = useDisplayNameStore((store) => store.displayName);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [rooms, setRooms] = useState<JoinableRoom[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRooms(): Promise<void> {
      try {
        const next = await listJoinableRooms();
        if (cancelled) return;
        setRooms(next);
        setRoomsLoaded(true);
      } catch {
        if (cancelled) return;
        setRoomsLoaded(true);
      }
    }

    void fetchRooms();
    const id = window.setInterval(() => void fetchRooms(), ROOMS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  async function refreshRooms(): Promise<void> {
    setRefreshing(true);
    try {
      const next = await listJoinableRooms();
      setRooms(next);
      setRoomsLoaded(true);
    } catch {
      // Silent fail — user can try again
    } finally {
      setTimeout(() => setRefreshing(false), 250);
    }
  }

  async function joinRoom(roomCode: string): Promise<void> {
    const normalizedName = storedDisplayName.trim();
    if (!normalizedName) {
      setError('Please set your display name from the lobby first.');
      return;
    }
    setError(null);
    setJoiningRoomId(roomCode);
    try {
      await joinByCode(roomCode, normalizedName);
      navigate('/waiting');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
      setJoiningRoomId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (code.length !== 4) {
        setError('Please enter a 4-character room code.');
        setLoading(false);
        return;
      }
      await joinRoom(code);
    } finally {
      setLoading(false);
    }
  }

  const submitting = loading || joiningRoomId !== null;

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
      <div className="ui-create-room-title mb-10">
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
            Join Room
          </StrokeShadowText>
        </div>
        <div className="ui-create-room-title__underline" aria-hidden>
          <span className="ui-create-room-title__underline-line" />
          <span className="ui-create-room-title__underline-gem" />
          <span className="ui-create-room-title__underline-line" />
        </div>
      </div>

      {/* Content */}
      <div className="flex w-full max-w-[960px] flex-col items-center gap-6">
        {/* Enter Code — freestanding (no panel) */}
        <section className="flex w-full max-w-[520px] flex-col items-stretch gap-3">
          <div className="self-start pl-2">
            <StrokeShadowText
              className="t24-eb"
              firstStrokeColor="#1a2555"
              secondStrokeColor="#2c5890"
              firstStrokeWidth={5}
              secondStrokeWidth={4}
              shadowOffsetY="0.16rem"
            >
              Enter Code
            </StrokeShadowText>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
            <div className="flex items-stretch gap-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                maxLength={4}
                required
                placeholder="XXXX"
                className="ui-name-input ui-name-input--inline flex-1 px-5 font-mono t28-eb"
                disabled={submitting}
                aria-label="Room code"
              />
              <button
                type="submit"
                disabled={submitting || code.length !== 4}
                className="ui-pill-button ui-pill-button--mint h-[68px] px-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-1 inline-block">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t20-eb"
                    style={JOIN_STROKE}
                  >
                    {loading ? '…' : 'Join'}
                  </span>
                  <span className="relative text-center uppercase text-white t20-eb">
                    {loading ? '…' : 'Join'}
                  </span>
                </span>
              </button>
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/20 px-4 py-2 t14-b font-nunito text-center text-red-200">
                {error}
              </p>
            )}
          </form>
        </section>

        {/* OR divider */}
        <div className="ui-or-divider w-full max-w-[520px] t18-b font-nunito">
          <span>OR</span>
        </div>

        {/* Public Rooms — frameless transparent section */}
        <section className="ui-public-rooms w-full">
          <header className="mb-4 flex items-center justify-between gap-4">
            <StrokeShadowText
              className="t28-eb"
              fillClassName="ui-create-room-title__text"
              fillStyle={{
                backgroundImage:
                  'linear-gradient(180deg, #ffffff 0%, #eef7ff 35%, #bfe4ff 72%, #8fd2ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              firstStrokeColor="#1a2555"
              secondStrokeColor="#2c5890"
              firstStrokeWidth={6}
              secondStrokeWidth={4}
              shadowOffsetY="0.18rem"
            >
              Public Rooms
            </StrokeShadowText>

            <button
              type="button"
              onClick={() => void refreshRooms()}
              disabled={refreshing}
              className="ui-refresh-chip font-nunito"
              aria-label="Refresh public rooms"
            >
              <RefreshIcon spinning={refreshing} />
              <span className="t12-b">Refresh</span>
            </button>
          </header>

          {!roomsLoaded && (
            <div className="flex items-center justify-center gap-3 py-8 text-white/65">
              <span
                aria-hidden
                className="h-6 w-6 rounded-full border-4 border-white/25 border-t-white animate-spin"
              />
              <p className="t16-b font-nunito">Loading rooms…</p>
            </div>
          )}

          {roomsLoaded && rooms.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-white/25 px-5 py-10 text-center">
              <p className="t16-b font-nunito text-white/55">No public rooms right now.</p>
              <p className="mt-1 t14-b font-nunito text-white/40">
                Create one or paste a join code above!
              </p>
            </div>
          )}

          {roomsLoaded && rooms.length > 0 && (
            <ul className="grid grid-cols-2 gap-3">
              {rooms.map((r) => {
                const joining = joiningRoomId === r.roomId;
                const anyJoining = joiningRoomId !== null;
                const full = r.clients >= r.maxClients;
                const disabled = anyJoining || full;

                return (
                  <li key={r.roomId}>
                    <div className="ui-public-room-row">
                      <span className="ui-public-room-row__icon">
                        <Icon name="users" size={26} decorative />
                      </span>

                      <span
                        className="font-mono t20-eb tracking-[0.16em] truncate"
                        style={{ color: '#1f2a55' }}
                      >
                        {r.roomId}
                      </span>

                      <div className="ml-auto flex items-center gap-2">
                        <span className="ui-public-room-row__count font-nunito t12-b">
                          <Icon name="user" size={16} decorative />
                          {r.clients}/{r.maxClients}
                        </span>

                        {r.drawingTime !== null && (
                          <span className="ui-public-room-row__count ui-public-room-row__count--dark font-nunito t12-b">
                            {r.drawingTime}s
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => void joinRoom(r.roomId)}
                          disabled={disabled}
                          className="ui-pill-button ui-pill-button--mint ui-pill-button--less-round h-[48px] px-5 shrink-0 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <span className="relative z-1 inline-block">
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t14-b"
                              style={SECTION_STROKE}
                            >
                              {joining ? '…' : full ? 'Full' : 'Join'}
                            </span>
                            <span className="relative text-center uppercase text-white t14-b">
                              {joining ? '…' : full ? 'Full' : 'Join'}
                            </span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={spinning ? 'animate-spin' : undefined}
    >
      <path d="M3 12a9 9 0 0 1 15.4-6.36L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.4 6.36L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
