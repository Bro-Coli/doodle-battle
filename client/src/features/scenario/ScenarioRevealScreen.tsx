import scenarioBackground from './assets/scenario-bg.png';
import scenarioTeamBlueBackground from './assets/scenario-team-blue-bg.webp';
import scenarioTeamRedBackground from './assets/scenario-team-red-bg.webp';
import scenarioVsText from './assets/scenario-vs-text.webp';

const roundBadgeStrokeStyle: React.CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #3a56c8',
};

export function ScenarioRevealScreen() {
  return (
    <main
      className="flex min-h-screen w-screen flex-col items-center overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${scenarioBackground})`,
      }}
    >
      <div className="pointer-events-none flex w-full justify-center pt-12">
        <div className="ui-pill-button ui-pill-button--static px-12">
          <span className="relative z-1 inline-block">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-b"
              style={roundBadgeStrokeStyle}
            >
              Round 1 / 5
            </span>
            <span className="relative text-center uppercase text-white t24-b">Round 1 / 5</span>
          </span>
        </div>
      </div>

      <div className="flex w-full justify-center pt-60">
        <div className="flex items-center gap-12">
          <div
            className="flex h-[440px] w-[620px] flex-col bg-contain bg-center bg-no-repeat p-6"
            style={{
              backgroundImage: `url(${scenarioTeamBlueBackground})`,
            }}
          ></div>

          <img
            src={scenarioVsText}
            alt="VS"
            className="block h-38 w-auto select-none object-contain"
            draggable={false}
          />

          <div
            className="flex h-[440px] w-[620px] flex-col bg-contain bg-center bg-no-repeat p-6"
            style={{
              backgroundImage: `url(${scenarioTeamRedBackground})`,
            }}
          ></div>
        </div>
      </div>
    </main>
  );
}
