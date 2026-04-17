import type { CSSProperties } from 'react';

import { Icon, YouBadge } from '@/ui';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

type ResultScoreCardProps = {
  team: string;
  score: number;
  variant?: 'pink' | 'blue';
  winner?: boolean;
  isMyTeam?: boolean;
};

export function ResultScoreCard({
  team,
  score,
  variant = 'pink',
  winner = false,
  isMyTeam = false,
}: ResultScoreCardProps) {
  const isBlue = variant === 'blue';
  const cardGradient = isBlue
    ? 'bg-[linear-gradient(180deg,#9de3fc_0%,#1e90ff_55%,#2a63e0_100%)]'
    : 'bg-[linear-gradient(180deg,#ff4da6_0%,#ff2d8d_100%)]';
  const cardDepthShadow = isBlue
    ? '[box-shadow:0_2px_0_#1554b8,0_4px_0_#114ca8,0_6px_0_#0d4498,0_8px_0_#093a84,0_10px_4px_rgba(7,40,100,0.45),inset_0_2px_0_rgba(255,255,255,0.35),inset_0_20px_30px_rgba(255,255,255,0.18),inset_0_-14px_20px_rgba(0,40,140,0.35)]'
    : '[box-shadow:0_2px_0_#b81070,0_4px_0_#a80c60,0_6px_0_#980850,0_8px_0_#840440,0_10px_4px_rgba(100,2,50,0.45),inset_0_2px_0_rgba(255,255,255,0.35),inset_0_20px_30px_rgba(255,255,255,0.16),inset_0_-14px_20px_rgba(120,5,60,0.35)]';

  const scoreFillStyle: CSSProperties = isBlue
    ? {
        background:
          'linear-gradient(to bottom, #ffffff 0%, #e8f8ff 24%, #d2ecff 44%, #9cccf9 66%, #7daee9 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }
    : {
        background:
          'linear-gradient(to bottom, #ffffff 0%, #ffeefe 24%, #ffd8f5 44%, #ffa9e9 66%, #f077ca 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      };

  const teamFirstStrokeColor = isBlue ? '#1852a8' : '#801e4d';
  const teamSecondStrokeColor = isBlue ? '#062B5E' : '#490c2c';
  const scoreFirstStrokeColor = isBlue ? '#144abe' : '#a10b62';
  const scoreSecondStrokeColor = isBlue ? '#0D2E6E' : '#6a0e45';
  const scoreDeepShadowColor = isBlue ? '#041a44' : '#3a0622';

  return (
    <div className="relative shrink-0 w-[400px]">
      {isMyTeam && (
        <div className="pointer-events-none absolute -left-8 -top-8 z-10 -rotate-24">
          <YouBadge className="scale-80 origin-top-left" />
        </div>
      )}
      <article
        className={[
          'relative overflow-hidden rounded-3xl border-[11px] border-white px-16 py-7 text-center',
          'translate-y-0 transition-transform',
          cardGradient,
          cardDepthShadow,
        ].join(' ')}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34%] rounded-t-2xl bg-white/20" />
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,transparent_45%,transparent_55%,rgba(0,0,0,0.08)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex h-[34%] items-center justify-center">
          <StrokeShadowText
            className="t28-eb lg:t24-eb"
            firstStrokeColor={teamFirstStrokeColor}
            secondStrokeColor={teamSecondStrokeColor}
            firstStrokeWidth={7}
            secondStrokeWidth={5}
            shadowOffsetY="0.18rem"
          >
            {team}
          </StrokeShadowText>
        </div>
        <div className="relative mt-[34%]">
          <div className="relative inline-flex items-center justify-center">
            <StrokeShadowText
              className="t72-eb lg:t60-eb"
              fillStyle={scoreFillStyle}
              firstStrokeColor={scoreFirstStrokeColor}
              secondStrokeColor={scoreSecondStrokeColor}
              firstStrokeWidth={7}
              secondStrokeWidth={5}
              shadowOffsetY="0.32rem"
              deepShadowColor={scoreDeepShadowColor}
              deepShadowOffsetY="0.3rem"
              deepShadowStrokeWidth={12}
              deepShadowBlur="3px"
            >
              {score}
            </StrokeShadowText>
            {winner && (
              <Icon
                name="trophy"
                size={52}
                color={isBlue ? '#0a2a7a' : '#8b0a4a'}
                className="absolute -right-20 top-1/2 -translate-y-1/2 rotate-12 drop-shadow-md"
              />
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
