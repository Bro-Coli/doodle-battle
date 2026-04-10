import { useEffect, useState } from 'react';
import { LobbyScreen } from '../features/lobby/LobbyScreen';
import { NameInputScreen } from '../features/lobby/NameInputScreen';
import { WaitingRoomScreen } from '../features/lobby/WaitingRoomScreen';
import { GameScreen } from '../features/game/GameScreen';
import { ScenarioRevealScreen } from '../features/scenario/ScenarioRevealScreen';
import { ResultScreen } from '../features/result/ResultScreen';

export function App(): React.JSX.Element {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (pathname === '/game') return <GameScreen />;
  if (pathname === '/lobby') return <NameInputScreen />;
  if (pathname === '/waiting') return <WaitingRoomScreen />;
  if (pathname === '/scenario') return <ScenarioRevealScreen />;
  if (pathname === '/result') return <ResultScreen />;
  return <LobbyScreen />;
}
