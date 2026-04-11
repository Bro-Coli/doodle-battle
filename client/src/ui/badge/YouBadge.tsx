import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

type YouBadgeProps = {
  className?: string;
};

export function YouBadge({ className = '' }: YouBadgeProps): React.JSX.Element {
  return (
    <div className={`ui-you-badge ${className}`.trim()}>
      <span className="relative">
        <StrokeShadowText
          className="t32-eb lg:t20-eb"
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
