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
import { Analytics } from '@vercel/analytics/react';

const DEFAULT_TITLE = 'Doodle Battle';
const ROUTE_META: Record<string, { description: string; title: string }> = {
  '/': {
    title: 'Doodle Battle',
    description: 'Draw creatures, battle in real time, and survive longer than other teams.',
  },
  '/lobby': {
    title: 'Lobby - Doodle Battle',
    description: 'Set your name and choose how you want to play Doodle Battle.',
  },
  '/create': {
    title: 'Create Room - Doodle Battle',
    description: 'Create a private or public room and tune the match settings.',
  },
  '/join': {
    title: 'Join Room - Doodle Battle',
    description: 'Enter an invite code to join an existing Doodle Battle room.',
  },
  '/quick': {
    title: 'Quick Play - Doodle Battle',
    description: 'Jump straight into matchmaking and start drawing fast.',
  },
  '/waiting': {
    title: 'Waiting Room - Doodle Battle',
    description: 'Wait for the host, balance teams, and get ready to start.',
  },
  '/game': {
    title: 'Battle - Doodle Battle',
    description: 'Draw, fight, and survive in the live battle arena.',
  },
  '/result': {
    title: 'Result - Doodle Battle',
    description: 'Review the match outcome and see who came out on top.',
  },
};

function updateMeta(name: string, content: string): void {
  const selector = `meta[name="${name}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

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

  useEffect(() => {
    const meta = ROUTE_META[pathname] ?? ROUTE_META['/'];
    document.title = meta.title ?? DEFAULT_TITLE;
    updateMeta('description', meta.description);
  }, [pathname]);

  let page: React.JSX.Element;

  if (pathname === '/game') page = <GameScreen />;
  else if (pathname === '/lobby') page = <NameInputScreen />;
  else if (pathname === '/create') page = <CreateRoomScreen />;
  else if (pathname === '/join') page = <JoinRoomScreen />;
  else if (pathname === '/waiting') page = <WaitingRoomScreen />;
  else if (pathname === '/result') page = <MatchResultScreen />;
  // Dev-only markup previews: these are accessible only during development
  // (the lobby dev-dock is already gated behind `import.meta.env.DEV`) and
  // fall back to the lobby in production so a stray URL can't leak them.
  else if (import.meta.env.DEV && pathname === '/dev/scenario') page = <ScenarioRevealScreen />;
  else if (import.meta.env.DEV && pathname === '/dev/result') page = <ResultScreen />;
  else page = <LobbyScreen />;

  return (
    <>
      {page}
      <Analytics />
    </>
  );
}
