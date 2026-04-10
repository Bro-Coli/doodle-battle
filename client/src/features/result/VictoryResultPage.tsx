import resultVictoryBg from './assets/result-victory-bg.webp';
import resultVictoryTitle from './assets/result-victory-title.webp';

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
      </div>
    </>
  );
}
