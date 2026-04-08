import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from 'pixi.js';
import mainBackground from './assets/main-bg.png';
import mainTitle from './assets/main-title.png';
import { DrawingCanvas } from './drawing/DrawingCanvas';
import { RecognitionOverlay } from './recognition/RecognitionOverlay';
import { StudioControlsApp } from './ui/StudioControlsApp';
import { createStudioController } from './ui/createStudioController';
import { WorldStage } from './world/WorldStage';

function navigate(pathname: string): void {
  if (window.location.pathname === pathname) return;
  window.history.pushState({}, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

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

function LobbyScreen(): React.JSX.Element {
  return (
    <main
      className="flex h-screen w-screen items-center justify-center bg-cover bg-center bg-no-repeat px-6"
      style={{ backgroundImage: `url(${mainBackground})` }}
    >
      <div className="flex w-full max-w-5xl flex-col items-center gap-8 pt-6 sm:gap-10 sm:pt-0">
        <img
          src={mainTitle}
          alt="Doodle Battle"
          className="w-full max-w-[820px] object-contain drop-shadow-[0_18px_40px_rgba(28,20,78,0.45)]"
        />
        <button
          className="cursor-pointer rounded-lg border border-white/70 bg-white/90 px-5 py-3 text-[15px] font-bold text-slate-800 shadow-[0_10px_30px_rgba(24,24,48,0.18)] transition hover:-translate-y-px hover:bg-white"
          type="button"
          onClick={() => navigate('/game')}
        >
          Quick Start
        </button>
      </div>
    </main>
  );
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
