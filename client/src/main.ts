import './style.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from 'pixi.js';
import { DrawingCanvas } from './drawing/DrawingCanvas';
import { RecognitionOverlay } from './recognition/RecognitionOverlay';
import { StudioControlsApp } from './ui/StudioControlsApp';
import { createStudioController } from './ui/createStudioController';
import { WorldStage } from './world/WorldStage';

async function init(): Promise<void> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    autoDensity: true,
    background: '#FFFFFF',
  });

  document.body.appendChild(app.canvas);

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
  document.body.appendChild(uiRoot);

  createRoot(uiRoot).render(createElement(StudioControlsApp, { controller }));

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

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      controller.undo();
    }
  });
}

init();
