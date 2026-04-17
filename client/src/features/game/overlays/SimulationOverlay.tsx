import { GameOverlayBadge } from '@/ui/overlay/GameOverlay';

type SimulationOverlayProps = {
  phaseTimer: number;
  entityCounts: { red: number; blue: number };
};

export function SimulationOverlay({
  phaseTimer,
  entityCounts,
}: SimulationOverlayProps): React.JSX.Element {
  const display = Math.max(0, Math.ceil(phaseTimer));

  return (
    <>
      <div className="fixed left-1/2 top-4 z-20 -translate-x-1/2 animate-[fadeSlideDown_0.3s_ease-out_both]">
        <div className="rounded-2xl bg-black/75 px-6 py-3 text-center font-bold text-3xl text-white tabular-nums shadow-lg backdrop-blur-sm">
          {display}
          <span className="ml-1 text-lg text-white/60">s</span>
        </div>
      </div>

      <div
        className="fixed left-1/2 top-20 z-20 -translate-x-1/2 animate-[fadeSlideDown_0.3s_ease-out_both]"
        style={{ animationDelay: '0.05s' }}
      >
        <GameOverlayBadge className="gap-4">
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
            <span className="font-bold text-red-300">{entityCounts.red}</span>
          </span>
          <span className="text-white/30">vs</span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
            <span className="font-bold text-blue-300">{entityCounts.blue}</span>
          </span>
        </GameOverlayBadge>
      </div>
    </>
  );
}
