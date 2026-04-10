import { useState } from 'react';

import { navigate } from '@/utils/navigate';

type ResultState = 'victory' | 'defeat';

export function ResultMarkupScreen(): React.JSX.Element {
  const [resultState, setResultState] = useState<ResultState>('victory');

  return (
    <main className="relative flex min-h-screen w-screen items-start justify-center bg-[#120c2d] px-6 py-8 sm:px-4">
      <div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-black/20 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-full border border-white/25 bg-black/25 px-4 py-2 font-nunito t14-b text-white/90 hover:bg-black/35"
          >
            Back to Lobby
          </button>
          <button
            type="button"
            onClick={() => setResultState('victory')}
            className={`rounded-full border px-4 py-2 font-nunito t14-b transition ${
              resultState === 'victory'
                ? 'border-emerald-300/80 bg-emerald-400/25 text-emerald-100'
                : 'border-white/25 bg-black/25 text-white/90 hover:bg-black/35'
            }`}
          >
            Victory
          </button>
          <button
            type="button"
            onClick={() => setResultState('defeat')}
            className={`rounded-full border px-4 py-2 font-nunito t14-b transition ${
              resultState === 'defeat'
                ? 'border-rose-300/80 bg-rose-400/25 text-rose-100'
                : 'border-white/25 bg-black/25 text-white/90 hover:bg-black/35'
            }`}
          >
            Defeat
          </button>
          <span className="ml-auto rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/60">
            state: {resultState}
          </span>
        </div>
      </div>
    </main>
  );
}
