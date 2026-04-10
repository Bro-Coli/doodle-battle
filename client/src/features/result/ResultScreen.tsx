import type { CSSProperties } from 'react';
import { useState } from 'react';

import { navigate } from '@/utils/navigate';
import { DefeatResultPage } from './DefeatResultPage';
import { VictoryResultPage } from './VictoryResultPage';

type ResultState = 'victory' | 'defeat';

export function ResultScreen(): React.JSX.Element {
  const [resultState, setResultState] = useState<ResultState>('victory');
  const lobbyStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '6px',
    WebkitTextStroke: 'var(--stroke) #6e6a95',
  };
  const playAgainStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '6px',
    WebkitTextStroke: 'var(--stroke) #0f6b7f',
  };

  return (
    <main className="relative flex min-h-screen w-screen flex-col overflow-hidden bg-[#120c2d] px-6 py-8">
      {resultState === 'victory' ? <VictoryResultPage /> : <DefeatResultPage />}
      <div className="absolute top-8 left-1/2 z-20 w-full max-w-5xl -translate-x-1/2 px-6">
        <div className="rounded-2xl border border-white/15 bg-black/28 p-4 backdrop-blur-[2px]">
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
      </div>

      <div className="relative mt-12 flex-center gap-8 pb-12">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="ui-pill-button ui-pill-button--gray ui-pill-button--less-round h-24 w-[400px]"
        >
          <span className="relative inline-block">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-eb sm:t18-eb"
              style={lobbyStrokeStyle}
            >
              Back to Lobby
            </span>
            <span className="relative text-center uppercase text-white t24-eb sm:t18-eb">
              Back to Lobby
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/lobby', '?flow=quick')}
          className="ui-pill-button ui-pill-button--mint ui-pill-button--less-round h-24 w-[400px]"
        >
          <span className="relative inline-block">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-eb sm:t18-eb"
              style={playAgainStrokeStyle}
            >
              Play Again
            </span>
            <span className="relative text-center uppercase text-white t24-eb sm:t18-eb">
              Play Again
            </span>
          </span>
        </button>
      </div>
    </main>
  );
}
