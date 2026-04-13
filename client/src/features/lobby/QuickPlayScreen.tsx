import { useState } from 'react';
import { quickPlay } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { setDisplayName, useDisplayNameStore } from './displayNameStore';
import { Icon } from '@/ui/icon/Icon';

export function QuickPlayScreen() {
  const storedDisplayName = useDisplayNameStore((store) => store.displayName);
  const [name, setName] = useState(storedDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const normalizedName = name.trim();
      await quickPlay(normalizedName);
      setDisplayName(normalizedName);
      navigate('/waiting');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen w-screen items-center justify-center px-4"
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
      <div className="w-full max-w-sm rounded-2xl bg-white/10 p-8 backdrop-blur-sm">
        <h1 className="mb-6 text-center text-2xl font-black uppercase tracking-tight text-white">
          Quick Play
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
              maxLength={16}
              required
              placeholder="Enter your name…"
              className="rounded-lg bg-white/20 px-4 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/60"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white/90 py-2 font-black uppercase text-[#1a1035] transition hover:bg-white disabled:opacity-60"
          >
            {loading ? 'Connecting…' : 'Quick Play'}
          </button>
        </form>
      </div>
    </main>
  );
}
