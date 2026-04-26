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
  land: 'Grassy plains. Best for walkers.',
  water: 'Open ocean. Best for swimmers.',
  air: 'Endless sky. Best for fliers.',
};

export function ObjectiveBanner({
  canvasBounds,
  mapType = 'land',
}: ObjectiveBannerProps): React.JSX.Element {
  return (
    <div
      className="fixed z-20 animate-[fadeSlideDown_0.4s_ease-out_both] flex flex-col items-center gap-2"
      style={{
        left: '50%',
        top: canvasBounds ? (140 + canvasBounds.y) / 2 : 76,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="ui-objective-banner whitespace-nowrap">
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
              {MAP_LABEL[mapType]}
            </span>{' '}
            - {MAP_DESCRIPTION[mapType]}
          </StrokeShadowText>
        </span>
      </div>
    </div>
  );
}
