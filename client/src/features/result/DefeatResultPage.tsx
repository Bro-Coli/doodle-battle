import type { ReactNode } from 'react';

import resultDefeatTitle from './assets/result-defeat-title.webp';
import resultVsText from './assets/scenario-vs-text.webp';
import { ResultScoreCard } from './ResultScoreCard';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

type TeamSlot = {
  label: string;
  variant: 'pink' | 'blue';
  score: number;
};

type DefeatResultPageProps = {
  /** Your (losing) team. Rendered on the LEFT with the "YOU" badge. */
  myTeam?: TeamSlot;
  /** Opposing (winning) team. Rendered on the RIGHT with the trophy. */
  oppTeam?: TeamSlot;
  /** Extra content rendered below the score cards (e.g. stats table). */
  children?: ReactNode;
};

const DEFAULT_MY_TEAM: TeamSlot = { label: 'Blue Team', variant: 'blue', score: 3 };
const DEFAULT_OPP_TEAM: TeamSlot = { label: 'Red Team', variant: 'pink', score: 5 };

export function DefeatResultPage({
  myTeam = DEFAULT_MY_TEAM,
  oppTeam = DEFAULT_OPP_TEAM,
  children,
}: DefeatResultPageProps = {}): React.JSX.Element {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, #6ECFEF 0%, #6cc5ea 24%, #6ca8df 48%, #6d88d3 68%, #706bc7 86%, #7458BC 100%)',
        }}
      />
      <div className="relative flex w-full flex-1 flex-col items-center justify-start pt-16">
        <img
          src={resultDefeatTitle}
          alt="Defeat"
          className="w-full max-w-[600px] scale-x-108 object-contain"
          style={{ aspectRatio: '2156 / 711' }}
          decoding="async"
          fetchPriority="high"
        />
        <div className="mt-6">
          <StrokeShadowText
            className="t32-eb font-nunito capitalize! lg:t28-eb"
            fillStyle={{
              background: 'linear-gradient(to bottom, #FFFFFF 0%, #C9F1FB 55%, #B4E9FD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            firstStrokeColor="#3c4183"
            secondStrokeColor="#3c4183"
            firstStrokeWidth={10}
            secondStrokeWidth={8}
            shadowOffsetY="0.26rem"
          >
            Better Luck Next Time!
          </StrokeShadowText>
        </div>
        <div className="mt-16 flex w-full items-center justify-center gap-10 px-4">
          <ResultScoreCard team={myTeam.label} score={myTeam.score} variant={myTeam.variant} isMyTeam />

          <img
            src={resultVsText}
            alt="VS"
            className="h-20 w-auto shrink-0 object-contain lg:h-16 md:h-14"
            style={{ aspectRatio: '1808 / 1335' }}
            decoding="async"
          />

          <ResultScoreCard team={oppTeam.label} score={oppTeam.score} variant={oppTeam.variant} winner />
        </div>
        {children}
      </div>
    </>
  );
}
