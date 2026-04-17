import { GameOverlay, GameOverlayBadge } from '@/ui/overlay/GameOverlay';

export function IdleOverlay(): React.JSX.Element {
  return (
    <GameOverlay centered>
      <GameOverlayBadge className="animate-pulse">
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white/60" />
        Waiting for game to start...
      </GameOverlayBadge>
    </GameOverlay>
  );
}
