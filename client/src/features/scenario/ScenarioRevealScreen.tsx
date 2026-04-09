import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

import scenarioBackground from './assets/scenario-bg.png';
import scenarioTeamBlueBackground from './assets/scenario-team-blue-bg.webp';
import scenarioTeamRedBackground from './assets/scenario-team-red-bg.webp';
import scenarioVsText from './assets/scenario-vs-text.webp';

const countdownFillStyle: CSSProperties = {
  background: 'linear-gradient(to bottom, #FFFFFF 0%, #B9DBF3 55%, #a8e4ee 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const roundBadgeStrokeStyle: React.CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #3a56c8',
};

export function ScenarioRevealScreen() {
  const [remainingSeconds, setRemainingSeconds] = useState(10);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main
      className="flex min-h-screen w-screen flex-col items-center overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${scenarioBackground})`,
      }}
    >
      {/* Round badge */}
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

      {/* Scenario */}
      <div className="flex w-full justify-center pt-8">
        <div className="flex items-center gap-12">
          <div
            className="flex h-[400px] w-[600px] flex-col bg-contain bg-center bg-no-repeat p-6"
            style={{
              backgroundImage: `url(${scenarioTeamBlueBackground})`,
            }}
          ></div>

          <img
            src={scenarioVsText}
            alt="VS"
            className="block h-32 w-auto select-none object-contain"
            draggable={false}
          />

          <div
            className="flex h-[400px] w-[600px] flex-col bg-contain bg-center bg-no-repeat p-6"
            style={{
              backgroundImage: `url(${scenarioTeamRedBackground})`,
            }}
          ></div>
        </div>
      </div>

      {/* Countdown */}
      <div className="pointer-events-none flex w-full justify-center pt-8">
        <p className="flex items-baseline gap-4 select-none" aria-live="polite" aria-atomic="true">
          <StrokeShadowText
            className="t72-eb"
            firstStrokeColor="#1a2555"
            secondStrokeColor="#2c5890"
            firstStrokeWidth={12}
            secondStrokeWidth={10}
            shadowOffsetY="0.4rem"
            fillStyle={countdownFillStyle}
          >
            Starts In
          </StrokeShadowText>
          <StrokeShadowText
            className="t96-eb ml-4"
            firstStrokeColor="#331C57"
            secondStrokeColor="#A01E75"
            firstStrokeWidth={12}
            secondStrokeWidth={10}
            shadowOffsetY="0.4rem"
            fillStyle={countdownFillStyle}
          >
            {remainingSeconds}
          </StrokeShadowText>
        </p>
      </div>
    </main>
  );
}
