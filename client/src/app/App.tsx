import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from 'pixi.js';
import { DrawingCanvas } from '../features/drawing/DrawingCanvas';
import { LobbyScreen } from '../features/lobby/LobbyScreen';
import { RecognitionOverlay } from '../features/recognition/RecognitionOverlay';
import { StudioControlsApp } from '../features/studio/StudioControlsApp';
import { createStudioController } from '../features/studio/createStudioController';
import { WorldStage } from '../features/world/WorldStage';

async function initGame(host: HTMLElement): Promise<() => void> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    autoDensity: true,
    background: '#FFFFFF',
  });

  app.canvas.className = 'block h-screen w-screen';
  host.appendChild(app.canvas);

  const worldStage = new WorldStage(app);
  const drawingCanvas = new DrawingCanvas(app);
  worldStage.drawingRoot.addChild(drawingCanvas.region);

  const overlay = new RecognitionOverlay();
  const controller = createStudioController({
    app,
    drawingCanvas,
    overlay,
    worldStage,
  });

  const uiRoot = document.createElement('div');
  uiRoot.id = 'ui-root';
  host.appendChild(uiRoot);

  const uiRootRenderer = createRoot(uiRoot);
  uiRootRenderer.render(<StudioControlsApp controller={controller} />);

  fetch('/api/recognize/status')
    .then((response) => response.json())
    .then((data: unknown) => {
      if (
        data &&
        typeof data === 'object' &&
        'mockMode' in data &&
        (data as { mockMode: boolean }).mockMode
      ) {
        controller.setMockMode(true);
      }
    })
    .catch(() => {
      // Non-critical — swallow error
    });

  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      controller.undo();
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    uiRootRenderer.unmount();
    app.destroy(true, { children: true });
    host.replaceChildren();
  };
}

function GameScreen(): React.JSX.Element {
  useEffect(() => {
    const host = document.getElementById('game-root');
    if (!host) return undefined;

    let cleanup: (() => void) | undefined;

    void initGame(host).then((teardown) => {
      cleanup = teardown;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return <div id="game-root" className="h-screen w-screen overflow-hidden" />;
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

  return pathname === '/game' ? <GameScreen /> : <LobbyScreen />;
}
