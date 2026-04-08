import type { RoundOutcome } from '../world/RoundOverlay';

interface RoundOutcomeCardProps {
  outcome: RoundOutcome;
  onDismiss: () => void;
}

export function RoundOutcomeCard({ outcome, onDismiss }: RoundOutcomeCardProps) {
  return (
    <div id="round-outcome" onClick={onDismiss}>
      <div className="round-outcome__heading">
        Round {outcome.roundNumber} Complete
      </div>
      <div className="round-outcome__section">
        Survived: {outcome.survivors.length > 0 ? outcome.survivors.join(', ') : 'None'}
      </div>
      <div className="round-outcome__section">
        Eliminated: {outcome.removed.length > 0 ? outcome.removed.join(', ') : 'None'}
      </div>
      <div className="round-outcome__hint">
        Click to continue drawing
      </div>
    </div>
  );
}
