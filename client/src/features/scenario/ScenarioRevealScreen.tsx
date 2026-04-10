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
  // Local player's team in the active room; defaults to blue for safe initial render.
  const [myTeam, setMyTeam] = useState<TeamId>('blue');

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
      <div className="pointer-events-none flex w-full justify-center mt-16 select-none lg:mt-8">
        <StrokeShadowText
          className="t72-eb lg:t60-eb"
          fillStyle={textillStyle}
          firstStrokeColor="#1a2555"
          secondStrokeColor="#2c5890"
          firstStrokeWidth={14}
          secondStrokeWidth={11}
          shadowOffsetY="0.45rem"
        >
          Final Survivors
        </StrokeShadowText>
      </div>
      {/* Scenario */}
      <div className="flex w-full mt-24 items-center justify-center lg:mt-16">
        <div className="flex shrink-0 items-center gap-8">
          <TeamCard
            team="blue"
            backgroundImage={scenarioTeamBlueBackground}
            isMyTeam={isBlueTeam}
          />
          <img
            src={scenarioVsText}
            alt="VS"
            width={1808}
            height={1335}
            className="block h-30 w-auto select-none object-contain lg:h-26"
            draggable={false}
            decoding="async"
          />
          <TeamCard team="red" backgroundImage={scenarioTeamRedBackground} isMyTeam={!isBlueTeam} />
        </div>
      </div>
      {/* Countdown intentionally hidden on lobby-flow scenario screen */}
    </main>
  );
}

/* --------------------------------------------------
 *   Team Card
 * ----------------------------------------------- */

const teamConfig = {
  blue: {
    label: 'Blue',
    fillStyle: {
      background: 'linear-gradient(to bottom, #FFFFFF 0%, #75ccf4 30%, #0692dd 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } as CSSProperties,
    firstStrokeColor: '#2872c6',
    secondStrokeColor: '#0D2E6E',
    missionFirstStroke: '#1852a8',
    missionSecondStroke: '#062B5E',
  },
  red: {
    label: 'Red',
    fillStyle: {
      background: 'linear-gradient(to bottom, #f9c0dc 0%, #ec83a6 40%, #C2185B 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } as CSSProperties,
    firstStrokeColor: '#880E4F',
    secondStrokeColor: '#4A0A2A',
    missionFirstStroke: '#801e4d',
    missionSecondStroke: '#490c2c',
  },
} as const;

function TeamCard({
  team,
  backgroundImage,
  isMyTeam,
}: {
  team: TeamId;
  backgroundImage: string;
  isMyTeam: boolean;
}) {
  const cfg = teamConfig[team];

  return (
    <div className="relative">
      <div
        className={`flex h-[360px] w-[560px] flex-col items-center justify-center gap-4 bg-contain bg-center bg-no-repeat p-6 select-none ${isMyTeam ? 'neon-glow-yellow' : ''} lg:h-[300px] lg:w-[500px]`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        {/* Team label */}
        <p className="flex items-end gap-3">
          <StrokeShadowText
            className="t28-eb lg:t24-eb"
            firstStrokeColor={cfg.firstStrokeColor}
            secondStrokeColor={cfg.secondStrokeColor}
            firstStrokeWidth={6}
            secondStrokeWidth={4}
            shadowOffsetY="0.15rem"
          >
            Team
          </StrokeShadowText>
          <StrokeShadowText
            className="t32-eb lg:t28-eb"
            fillStyle={cfg.fillStyle}
            firstStrokeColor={cfg.firstStrokeColor}
            secondStrokeColor={cfg.secondStrokeColor}
            firstStrokeWidth={8}
            secondStrokeWidth={6}
            shadowOffsetY="0.25rem"
          >
            {cfg.label}
          </StrokeShadowText>
        </p>

        {/* Mission title */}
        <StrokeShadowText
          className="t48-eb lg:t40-eb"
          fillStyle={{
            background: 'linear-gradient(to bottom, #FFFFFF 0%, #E0E8F0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          firstStrokeColor={cfg.missionFirstStroke}
          secondStrokeColor={cfg.missionSecondStroke}
          firstStrokeWidth={10}
          secondStrokeWidth={8}
          shadowOffsetY="0.3rem"
        >
          Survive!
        </StrokeShadowText>

        {/* Mission description */}
        <p className="max-w-[80%] text-center text-white/90 t18-b lg:t16-b font-nunito">
          Stay alive until the timer runs out!
        </p>
      </div>
      {isMyTeam && (
        <div className="absolute -top-6 left-1/2 z-10 -translate-x-1/2">
          <YouBadge />
        </div>
      )}
    </div>
  );
}
