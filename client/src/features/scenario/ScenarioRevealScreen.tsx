import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { getActiveRoom } from '@/network/ColyseusClient';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

import { YouBadge } from './parts/YouBadge';

import scenarioBackground from './assets/scenario-bg.png';
import scenarioTeamBlueBackground from './assets/scenario-team-blue-bg.webp';
import scenarioTeamRedBackground from './assets/scenario-team-red-bg.webp';
import scenarioVsText from './assets/scenario-vs-text.webp';

const textillStyle: CSSProperties = {
  background: 'linear-gradient(to bottom, #FFFFFF 0%, #c5ddee 55%, #a8e4ee 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const roundBadgeStrokeStyle: React.CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #3a56c8',
};

type TeamId = 'red' | 'blue';

export function ScenarioRevealScreen() {
  const [remainingSeconds, setRemainingSeconds] = useState(10);
  // Local player's team in the active room; defaults to blue for safe initial render.
  const [myTeam, setMyTeam] = useState<TeamId>('blue');

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const room = getActiveRoom();
    if (!room) return;

    // Keep team ownership in sync with live room state so highlight/badge follows "my team".
    const syncMyTeam = () => {
      const state = room.state as {
        players?: Map<string, { team: string }>;
      };
      const myPlayer = state.players?.get(room.sessionId);
      if (myPlayer?.team === 'red' || myPlayer?.team === 'blue') {
        setMyTeam(myPlayer.team);
      }
    };

    syncMyTeam();
    room.onStateChange(syncMyTeam);
    return () => room.onStateChange.remove(syncMyTeam);
  }, []);

  // Blue card is on the left, red card is on the right.
  const isBlueTeam = myTeam === 'blue';

  return (
    <main
      className="flex min-h-screen w-screen flex-col items-center overflow-hidden bg-cover bg-center bg-no-repeat pb-12"
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
              className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-b lg:t20-b"
              style={roundBadgeStrokeStyle}
            >
              Round 1 / 5
            </span>
            <span className="relative text-center uppercase text-white t24-b lg:t20-b">
              Round 1 / 5
            </span>
          </span>
        </div>
      </div>
      {/* Round Title */}
      <div className="pointer-events-none flex w-full justify-center pt-12 select-none">
        <span
          className="uppercase t60-eb lg:t50-eb "
          style={{
            ...textillStyle,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
          }}
        >
          FINAL SURVIVORS
        </span>
      </div>
      {/* Scenario */}
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="flex shrink-0 items-center gap-12">
          <TeamCard backgroundImage={scenarioTeamBlueBackground} isMyTeam={isBlueTeam} />
          <img
            src={scenarioVsText}
            alt="VS"
            className="block h-32 w-auto select-none object-contain lg:h-28"
            draggable={false}
          />
          <TeamCard backgroundImage={scenarioTeamRedBackground} isMyTeam={!isBlueTeam} />
        </div>
      </div>
      {/* Countdown */}
      <div className="pointer-events-none flex w-full justify-center pt-8">
        <p className="flex items-center gap-8 select-none" aria-live="polite" aria-atomic="true">
          <StrokeShadowText
            className="t72-eb lg:t60-eb"
            firstStrokeColor="#1a2555"
            secondStrokeColor="#2c5890"
            firstStrokeWidth={12}
            secondStrokeWidth={10}
            shadowOffsetY="0.4rem"
            fillStyle={textillStyle}
          >
            Starts In
          </StrokeShadowText>
          <StrokeShadowText
            className="t96-eb lg:t68-eb"
            firstStrokeColor="#331C57"
            secondStrokeColor="#A01E75"
            firstStrokeWidth={12}
            secondStrokeWidth={10}
            shadowOffsetY="0.4rem"
            fillStyle={textillStyle}
          >
            {remainingSeconds}
          </StrokeShadowText>
        </p>
      </div>
    </main>
  );
}

/* --------------------------------------------------
 *   Team Card
 * ----------------------------------------------- */

function TeamCard({ backgroundImage, isMyTeam }: { backgroundImage: string; isMyTeam: boolean }) {
  return (
    <div className="relative">
      <div
        className={`flex h-[380px] w-[580px] flex-col bg-contain bg-center bg-no-repeat p-6 ${isMyTeam ? 'neon-glow-yellow' : ''} lg:h-[300px] lg:w-[500px]`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>
      {isMyTeam && (
        <div className="absolute -top-6 left-1/2 z-10 -translate-x-1/2">
          <YouBadge />
        </div>
      )}
    </div>
  );
}
