import { useState } from 'react';
import { createRoom, joinByCode, quickPlay } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';

function getFlow(): 'quick' | 'create' | 'join' {
  const params = new URLSearchParams(window.location.search);
  const flow = params.get('flow');
  if (flow === 'create' || flow === 'join') return flow;
  return 'quick';
}

function getTitle(flow: 'quick' | 'create' | 'join'): string {
  if (flow === 'create') return 'Create Room';
  if (flow === 'join') return 'Join Room';
  return 'Quick Play';
}

export function NameInputScreen(): React.JSX.Element {
  const flow = getFlow();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (flow === 'quick') {
        await quickPlay(name.trim());
      } else if (flow === 'create') {
        await createRoom({ name: name.trim(), maxPlayers, isPrivate: false });
      } else {
        if (code.length !== 4) {
          setError('Please enter a 4-character room code.');
          setLoading(false);
          return;
        }
        await joinByCode(code, name.trim());
      }
      navigate('/waiting');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-screen items-center justify-center bg-[#1a1035] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/10 p-8 backdrop-blur-sm">
        <h1 className="mb-6 text-center text-2xl font-black uppercase tracking-tight text-white">
          {getTitle(flow)}
        </h1>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold uppercase tracking-wide text-white/70">
              Display Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              required
              placeholder="Enter your name…"
              className="rounded-lg bg-white/20 px-4 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/60"
            />
          </label>

          {flow === 'join' && (
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
          )}

          {flow === 'create' && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold uppercase tracking-wide text-white/70">
                Max Players
              </span>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="rounded-lg bg-white/20 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-white/60"
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n} className="bg-[#1a1035]">
                    {n} players
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300">
              {error}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 rounded-lg border border-white/30 py-2 font-bold text-white/70 transition hover:bg-white/10"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-white/90 py-2 font-black uppercase text-[#1a1035] transition hover:bg-white disabled:opacity-60"
            >
              {loading ? 'Connecting…' : getTitle(flow)}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
