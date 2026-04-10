import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

const RING_VB = 300;
const RING_TRACK_W = 24;
const RING_GOLD_W = 16;
const RING_R = (RING_VB - RING_TRACK_W) / 2 - 20;
const RING_C = 2 * Math.PI * RING_R;
const CX = RING_VB / 2;
const CY = RING_VB / 2;

export function CountdownRing({ remaining, total }: { remaining: number; total: number }) {
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const dashArray = `${progress} 1`;
  const glowOpacity = Math.min(progress * 3, 1) * 0.6;

  return (
    <div
      className="relative flex-center h-[300px] w-[300px] select-none lg:h-[240px] lg:w-[240px]"
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Starts in ${remaining} seconds`}
    >
      <svg viewBox={`0 0 ${RING_VB} ${RING_VB}`} className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient
            id="cd-ring-grad"
            gradientUnits="userSpaceOnUse"
            x1={CX}
            y1={CY - RING_R}
            x2={CX}
            y2={CY + RING_R}
          >
            <stop offset="0%" stopColor="#FFF9C4" />
            <stop offset="30%" stopColor="#FFE082" />
            <stop offset="60%" stopColor="#FFD54F" />
            <stop offset="100%" stopColor="#FFB300" />
          </linearGradient>

          {/* Tight glow around the ring */}
          <filter id="cd-glow-tight" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b1" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Wide ambient neon glow */}
          <filter id="cd-glow-wide" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
          </filter>

          {/* Highlight shimmer filter */}
          <filter id="cd-highlight" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* Inner dark fill */}
        <circle cx={CX} cy={CY} r={RING_R - RING_TRACK_W / 2 - 1} fill="rgba(10, 8, 4, 0.35)" />

        {/* === Wide ambient neon glow (behind everything) === */}
        {progress > 0 && (
          <circle
            cx={CX}
            cy={CY}
            r={RING_R}
            fill="none"
            stroke="#FFD54F"
            strokeWidth={RING_GOLD_W + 4}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={dashArray}
            strokeDashoffset={0}
            filter="url(#cd-glow-wide)"
            opacity={glowOpacity}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 1s linear, opacity 1s linear' }}
          />
        )}

        {/* === Dark track channel (the groove) === */}
        <circle
          cx={CX}
          cy={CY}
          r={RING_R}
          fill="none"
          stroke="#140E04"
          strokeWidth={RING_TRACK_W}
        />
        {/* Outer edge border */}
        <circle
          cx={CX}
          cy={CY}
          r={RING_R + RING_TRACK_W / 2 - 1}
          fill="none"
          stroke="#3D2E14"
          strokeWidth={2}
          opacity={0.6}
        />
        {/* Inner edge border */}
        <circle
          cx={CX}
          cy={CY}
          r={RING_R - RING_TRACK_W / 2 + 1}
          fill="none"
          stroke="#3D2E14"
          strokeWidth={2}
          opacity={0.6}
        />

        {/* === Gold progress ring with tight glow === */}
        <circle
          cx={CX}
          cy={CY}
          r={RING_R}
          fill="none"
          stroke="url(#cd-ring-grad)"
          strokeWidth={RING_GOLD_W}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={dashArray}
          strokeDashoffset={0}
          filter="url(#cd-glow-tight)"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />

        {/* === Highlight shimmer on upper-right arc === */}
        {progress > 0.2 && (
          <circle
            cx={CX}
            cy={CY}
            r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${RING_C * 0.15} ${RING_C * 0.85}`}
            filter="url(#cd-highlight)"
            transform={`rotate(-60 ${CX} ${CY})`}
            style={{ transition: 'opacity 0.5s', opacity: progress < 0.3 ? 0 : 1 }}
          />
        )}
      </svg>

      {/* Text overlay */}
      <div className="relative flex flex-col items-center leading-none">
        <StrokeShadowText
          className="t28-eb lg:t24-eb"
          firstStrokeColor="#3E1E00"
          secondStrokeColor="#6B3A10"
          firstStrokeWidth={8}
          secondStrokeWidth={6}
          shadowOffsetY="0.18rem"
        >
          Starts In
        </StrokeShadowText>
        <StrokeShadowText
          className="t80-eb lg:t68-eb"
          firstStrokeColor="#3E1E00"
          secondStrokeColor="#6B3A10"
          firstStrokeWidth={12}
          secondStrokeWidth={9}
          shadowOffsetY="0.35rem"
        >
          {remaining}
        </StrokeShadowText>
      </div>
    </div>
  );
}
