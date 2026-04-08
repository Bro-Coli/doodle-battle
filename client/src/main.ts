import './style.css';
import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from 'pixi.js';
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
  uiRootRenderer.render(createElement(StudioControlsApp, { controller }));

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
  return createElement(
    'main',
    { className: 'lobby' },
    createElement(
      'button',
      {
        className: 'lobby__button',
        type: 'button',
        onClick: () => navigate('/game'),
      },
      'Quick Start',
    ),
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

  return createElement('div', { id: 'game-root', className: 'game-root' });
}

function App(): React.JSX.Element {
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

  return pathname === '/game'
    ? createElement(GameScreen)
    : createElement(LobbyScreen);
}

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('App root element not found.');
}

createRoot(rootElement).render(createElement(App));
