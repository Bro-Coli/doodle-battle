import { useEffect, useState } from 'react';
import { LobbyScreen } from '../features/lobby/LobbyScreen';
import { NameInputScreen } from '../features/lobby/NameInputScreen';
import { CreateRoomScreen } from '../features/lobby/CreateRoomScreen';
import { JoinRoomScreen } from '../features/lobby/JoinRoomScreen';
import { WaitingRoomScreen } from '../features/lobby/WaitingRoomScreen';
import { GameScreen } from '../features/game/GameScreen';
import { ScenarioRevealScreen } from '../features/scenario/ScenarioRevealScreen';
import { MatchResultScreen } from '../features/result/MatchResultScreen';
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
  if (pathname === '/create') return <CreateRoomScreen />;
  if (pathname === '/join') return <JoinRoomScreen />;
  if (pathname === '/waiting') return <WaitingRoomScreen />;
  if (pathname === '/result') return <MatchResultScreen />;

  // Dev-only markup previews: these are accessible only during development
  // (the lobby dev-dock is already gated behind `import.meta.env.DEV`) and
  // fall back to the lobby in production so a stray URL can't leak them.
  if (import.meta.env.DEV) {
    if (pathname === '/dev/scenario') return <ScenarioRevealScreen />;
    if (pathname === '/dev/result') return <ResultScreen />;
  }

  return <LobbyScreen />;
}
