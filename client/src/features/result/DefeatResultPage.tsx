import resultDefeatTitle from './assets/result-defeat-title.webp';
import resultVsText from './assets/scenario-vs-text.webp';
import { ResultScoreCard } from './ResultScoreCard';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

export function DefeatResultPage(): React.JSX.Element {
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
          <ResultScoreCard team="Blue Team" score={3} variant="blue" isMyTeam />

          <img
            src={resultVsText}
            alt="VS"
            className="h-20 w-auto shrink-0 object-contain lg:h-16 md:h-14"
            style={{ aspectRatio: '1808 / 1335' }}
            decoding="async"
          />

          <ResultScoreCard team="Red Team" score={5} variant="pink" winner />
        </div>
      </div>
    </>
  );
}
