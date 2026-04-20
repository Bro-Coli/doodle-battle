import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

type MapType = 'land' | 'water' | 'air';

type ObjectiveBannerProps = {
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
  mapType?: MapType;
};

const MAP_LABEL: Record<MapType, string> = {
  land: 'LAND',
  water: 'WATER',
  air: 'AIR',
};

const MAP_DESCRIPTION: Record<MapType, string> = {
  land: 'Draw something that can walk — fliers will be grounded, fish will suffocate.',
  water: 'Draw something that can swim — land dwellers and fliers will drown.',
  air: 'Draw something that can fly — everything else will fall.',
};

const MAP_BADGE_COLOR: Record<MapType, { bg: string; text: string }> = {
  land: { bg: 'linear-gradient(to bottom, #A8E88E 0%, #5FB34A 100%)', text: '#1f3a15' },
  water: { bg: 'linear-gradient(to bottom, #7DD3FC 0%, #3B82C4 100%)', text: '#082a3d' },
  air: { bg: 'linear-gradient(to bottom, #FFFFFF 0%, #D7E4F5 100%)', text: '#2a3b55' },
};

export function ObjectiveBanner({ canvasBounds, mapType = 'land' }: ObjectiveBannerProps): React.JSX.Element {
  const badge = MAP_BADGE_COLOR[mapType];

  return (
    <div
      className="fixed z-20 animate-[fadeSlideDown_0.4s_ease-out_both] flex flex-col items-center gap-2"
      style={{
        left: '50%',
        top: canvasBounds ? (80 + canvasBounds.y) / 2 : 76,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="ui-objective-banner whitespace-nowrap">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-1 shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
        >
          <path
            d="M12 2L4 6V12C4 16.42 7.38 20.54 12 22C16.62 20.54 20 16.42 20 12V6L12 2Z"
            fill="url(#shield-gradient)"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="1"
          />
          <path
            d="M12 7.5L13.1 10.1L15.8 10.3L13.7 12.1L14.4 14.8L12 13.3L9.6 14.8L10.3 12.1L8.2 10.3L10.9 10.1L12 7.5Z"
            fill="url(#star-gradient)"
          />
          <defs>
            <linearGradient id="shield-gradient" x1="12" y1="2" x2="12" y2="22">
              <stop stopColor="#BDECFF" />
              <stop offset="0.55" stopColor="#7DD3FC" />
              <stop offset="1" stopColor="#A78BFA" />
            </linearGradient>
            <linearGradient id="star-gradient" x1="12" y1="7" x2="12" y2="15">
              <stop stopColor="#FFFCE3" />
              <stop offset="1" stopColor="#FFD54F" />
            </linearGradient>
          </defs>
        </svg>

        <span className="relative">
          <StrokeShadowText
            className="t20-eb tracking-wide normal-case!"
            firstStrokeColor="#595B9D"
            secondStrokeColor="#2D2E4A"
            firstStrokeWidth={6}
            secondStrokeWidth={6}
            shadowOffsetY="0.15rem"
          >
            <span
              style={{
                background: 'linear-gradient(to bottom, #FFFCE3 0%, #FFD54F 55%, #F5A623 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
                filter: 'drop-shadow(0 0 4px rgba(255, 215, 90, 0.35))',
              }}
            >
              SURVIVE
            </span>{' '}
            - Have more creatures alive
          </StrokeShadowText>
        </span>
      </div>

      <div
        className="flex items-center gap-2 rounded-full px-4 py-1.5 shadow-md"
        style={{ background: badge.bg }}
      >
        <span
          className="t14-eb tracking-wider"
          style={{ color: badge.text }}
        >
          NEXT MAP: {MAP_LABEL[mapType]}
        </span>
      </div>
      <div className="max-w-md text-center text-white/85 t12-sb drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
        {MAP_DESCRIPTION[mapType]}
      </div>
    </div>
  );
}
