import scenarioBackground from './assets/scenario-bg.png';

export function ScenarioRevealScreen() {
  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${scenarioBackground})`,
      }}
    >
      <div className="pointer-events-none absolute top-8 left-1/2 z-10 -translate-x-1/2">
        <div className="ui-pill-button ui-pill-button--static px-12">
          <span className="t20-b uppercase  text-white [text-shadow:-2px_0_#3f5dad,2px_0_#3f5dad,0_-2px_#3f5dad,0_2px_#3f5dad,0_4px_6px_rgba(0,0,0,0.18)]">
            Round 1 / 5
          </span>
        </div>
      </div>
    </main>
  );
}
