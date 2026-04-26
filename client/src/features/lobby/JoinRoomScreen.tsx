import { useEffect, useState } from 'react';
import { joinByCode, listJoinableRooms, type JoinableRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { useDisplayNameStore } from './displayNameStore';
import { Icon } from '@/ui/icon/Icon';

const ROOMS_POLL_INTERVAL_MS = 3000;

export function JoinRoomScreen() {
  const storedDisplayName = useDisplayNameStore((store) => store.displayName);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [rooms, setRooms] = useState<JoinableRoom[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
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

  return (
    <main
      className="relative flex min-h-screen w-screen items-start justify-center px-4 py-12"
      style={{
        background: 'var(--gradient-lobby)',
      }}
    >
      <button
        type="button"
        onClick={() => navigate('/')}
        className="ui-icon-button ui-icon-button--sm absolute top-6 left-6 sm:top-4 sm:left-4"
        aria-label="Back to lobby"
      >
        <Icon name="arrowLeft" size={48} decorative />
      </button>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="rounded-2xl bg-white/10 p-8 backdrop-blur-sm">
          <h1 className="mb-6 text-center text-2xl font-black uppercase tracking-tight text-white">
            Join Room
          </h1>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold uppercase tracking-wide text-white/70">
                Room Code
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                maxLength={4}
                required
                placeholder="ABCD"
                className="rounded-lg bg-white/20 px-4 py-2 font-mono text-lg tracking-widest text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/60"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || joiningRoomId !== null}
              className="w-full rounded-lg bg-white/90 py-2 font-black uppercase text-[#1a1035] transition hover:bg-white disabled:opacity-60"
            >
              {loading ? 'Connecting…' : 'Join Room'}
            </button>
          </form>
        </div>

        <ServerBrowser
          rooms={rooms}
          loaded={roomsLoaded}
          joiningRoomId={joiningRoomId}
          onJoin={(rid) => void joinRoom(rid)}
        />
      </div>
    </main>
  );
}

function ServerBrowser({
  rooms,
  loaded,
  joiningRoomId,
  onJoin,
}: {
  rooms: JoinableRoom[];
  loaded: boolean;
  joiningRoomId: string | null;
  onJoin: (roomId: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-center text-lg font-black uppercase tracking-wide text-white">
        Open Rooms
      </h2>

      {!loaded && (
        <p className="text-center text-sm text-white/60">Loading…</p>
      )}

      {loaded && rooms.length === 0 && (
        <p className="text-center text-sm text-white/60">
          No public rooms — create one or enter a code above.
        </p>
      )}

      {loaded && rooms.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rooms.map((r) => {
            const joining = joiningRoomId === r.roomId;
            const anyJoining = joiningRoomId !== null;
            return (
              <li key={r.roomId}>
                <button
                  type="button"
                  onClick={() => onJoin(r.roomId)}
                  disabled={anyJoining}
                  className="group flex w-full items-center justify-between gap-4 rounded-lg bg-white/10 px-4 py-3 text-left transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="font-mono text-lg font-black tracking-widest text-white">
                    {r.roomId}
                  </span>
                  <span className="flex items-center gap-3 text-sm font-bold text-white/80">
                    <span>
                      {r.clients}/{r.maxClients}
                    </span>
                    {r.drawingTime !== null && (
                      <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs uppercase tracking-wider">
                        {r.drawingTime}s
                      </span>
                    )}
                    <span className="text-white/50 group-hover:text-white">
                      {joining ? '…' : '→'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
