import { GameOverlay, GameOverlayBadge } from '@/ui/overlay/GameOverlay';

export function IdleOverlay(): React.JSX.Element {
  return (
    <GameOverlay centered>
      <div className="flex flex-col items-center gap-5 animate-[fadeSlideUp_0.35s_ease-out_both]">
        <div className="relative flex items-center justify-center">
          <span
            className="absolute inline-block h-14 w-14 rounded-full animate-ping"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
            }}
          />
          <span
            className="relative inline-block h-4 w-4 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, #FFFDE7 0%, #FFD54F 50%, #F5A623 100%)',
              boxShadow:
                '0 0 18px rgba(255,210,80,0.75), 0 0 36px rgba(255,180,40,0.45), inset 0 0 0 1px rgba(255,255,255,0.35)',
            }}
          />
        </div>
        <GameOverlayBadge>
          <span className="font-nunito text-[1.05rem] font-black tracking-[0.16em] text-white uppercase">
            Waiting for game
          </span>
        </GameOverlayBadge>
      </div>
    </GameOverlay>
  );
}
