import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

type ObjectiveBannerProps = {
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
};

export function ObjectiveBanner({ canvasBounds }: ObjectiveBannerProps): React.JSX.Element {
  return (
    <div
      className="fixed z-20 animate-[fadeSlideDown_0.4s_ease-out_both]"
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
    </div>
  );
}
