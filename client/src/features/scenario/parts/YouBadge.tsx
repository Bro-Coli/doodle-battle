import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

export function YouBadge() {
  return (
    <div className="ui-you-badge">
      <span className="relative">
        <StrokeShadowText
          className="t32-eb"
          firstStrokeColor="#A96A1E"
          secondStrokeColor="#623F17"
          firstStrokeWidth={6}
          secondStrokeWidth={6}
          shadowOffsetY="0.2rem"
        >
          You
        </StrokeShadowText>
      </span>
    </div>
  );
}
