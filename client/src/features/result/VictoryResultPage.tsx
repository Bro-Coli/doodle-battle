import resultVictoryBg from './assets/result-victory-bg.webp';
import resultVictoryTitle from './assets/result-victory-title.webp';
import resultVsText from './assets/scenario-vs-text.webp';
import { ResultScoreCard } from './ResultScoreCard';

export function VictoryResultPage() {
  return (
    <>
      <img
        src={resultVictoryBg}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="relative flex min-h-screen w-full flex-col items-center justify-start pt-16">
        <img
          src={resultVictoryTitle}
          alt="Victory"
          className="w-full max-w-[760px] scale-x-106 object-contain"
          decoding="async"
        />
        <div className="mt-12 flex w-full items-center justify-center gap-10 px-4">
          <ResultScoreCard team="Blue Team" score={850} variant="blue" />

          <img
            src={resultVsText}
            alt="VS"
            className="h-20 w-auto shrink-0 object-contain lg:h-16"
            decoding="async"
          />

          <ResultScoreCard team="Red Team" score={620} variant="pink" />
        </div>
      </div>
    </>
  );
}
