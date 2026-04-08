import type { RoundOutcome } from '../world/RoundOverlay';

interface RoundOutcomeCardProps {
  outcome: RoundOutcome;
  onDismiss: () => void;
}

export function RoundOutcomeCard({ outcome, onDismiss }: RoundOutcomeCardProps) {
  return (
    <div
      onClick={onDismiss}
      className="fixed top-1/2 left-1/2 z-50 min-w-[260px] max-w-[400px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl border border-neutral-300 bg-white px-9 py-7 text-center font-sans shadow-[0_8px_32px_rgba(0,0,0,0.18)] select-none"
    >
      <div className="mb-4 text-[1.4em] font-bold text-neutral-900">
        Round {outcome.roundNumber} Complete
      </div>
      <div className="mb-2 text-[0.95em] leading-6 text-neutral-700">
        Survived: {outcome.survivors.length > 0 ? outcome.survivors.join(', ') : 'None'}
      </div>
      <div className="mb-2 text-[0.95em] leading-6 text-neutral-700">
        Eliminated: {outcome.removed.length > 0 ? outcome.removed.join(', ') : 'None'}
      </div>
      <div className="mt-4 text-xs text-neutral-400">
        Click to continue drawing
      </div>
    </div>
  );
}
