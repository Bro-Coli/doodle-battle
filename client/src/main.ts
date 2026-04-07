import './style.css';
import { Application } from 'pixi.js';
import { DrawingCanvas } from './drawing/DrawingCanvas';
import { ThicknessPreset } from './drawing/StrokeRenderer';
import { exportPng } from './drawing/exportPng';
import { recognizeDrawing } from './recognition/recognizeApi';
import { RecognitionOverlay } from './recognition/RecognitionOverlay';

async function init(): Promise<void> {
  // PixiJS v8 pattern: create Application, then await app.init()
  const app = new Application();
  await app.init({
    resizeTo: window,
    autoDensity: true,
    background: '#FFFFFF',
  });

  document.body.appendChild(app.canvas);

  // Create drawing canvas and add to stage
  const drawingCanvas = new DrawingCanvas(app);
  app.stage.addChild(drawingCanvas.region);

  // Recognition overlay (manages spinner, result card, error toast, mock badge)
  const overlay = new RecognitionOverlay();

  // Create toolbar overlay
  const toolbar = document.createElement('div');
  toolbar.id = 'toolbar';

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Submit';
  submitBtn.disabled = true;

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.disabled = true;

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.disabled = true;

  // Thickness toggle buttons
  const thicknessToggle = document.createElement('div');
  thicknessToggle.id = 'thickness-toggle';

  const thicknessPresets: ThicknessPreset[] = ['thin', 'medium', 'thick'];
  const thicknessLabels: Record<ThicknessPreset, string> = {
    thin: 'Thin',
    medium: 'Medium',
    thick: 'Thick',
  };
  const thicknessButtons: Record<ThicknessPreset, HTMLButtonElement> = {} as Record<ThicknessPreset, HTMLButtonElement>;

  for (const preset of thicknessPresets) {
    const btn = document.createElement('button');
    btn.textContent = thicknessLabels[preset];
    btn.dataset['preset'] = preset;
    if (preset === 'medium') btn.classList.add('active');
    btn.addEventListener('click', () => {
      drawingCanvas.setThickness(preset);
      for (const p of thicknessPresets) {
        thicknessButtons[p].classList.toggle('active', p === preset);
      }
    });
    thicknessButtons[preset] = btn;
    thicknessToggle.appendChild(btn);
  }

  // Sync button enabled/disabled state based on canvas emptiness
  // (declared here so disableAllToolbar/enableAllToolbar can reference it)
  const syncButtonState = (): void => {
    const empty = drawingCanvas.isEmpty;
    submitBtn.disabled = empty;
    clearBtn.disabled = empty;
    undoBtn.disabled = empty;
  };

  const disableAllToolbar = (): void => {
    submitBtn.disabled = true;
    clearBtn.disabled = true;
    undoBtn.disabled = true;
    for (const preset of thicknessPresets) {
      thicknessButtons[preset].disabled = true;
    }
  };

  const enableAllToolbar = (): void => {
    for (const preset of thicknessPresets) {
      thicknessButtons[preset].disabled = false;
    }
    syncButtonState(); // restore correct state for action buttons
  };

  // Wire action buttons
  submitBtn.addEventListener('click', () => {
    void (async () => {
      const dataUrl = exportPng(app, drawingCanvas.strokeContainerRef, drawingCanvas.region);
      if (dataUrl === null) return; // safety guard — button should be disabled when empty anyway
      // DO NOT clear canvas here — clear on card dismiss (locked decision)
      overlay.showSpinner();
      disableAllToolbar();
      try {
        const profile = await recognizeDrawing(dataUrl);
        overlay.showCard(profile, () => {
          drawingCanvas.clear();
          enableAllToolbar();
        });
      } catch {
        overlay.showError('Recognition failed. Try again.', () => {
          enableAllToolbar();
        });
      }
    })();
  });

  clearBtn.addEventListener('click', () => {
    drawingCanvas.clear();
  });

  undoBtn.addEventListener('click', () => {
    drawingCanvas.undo();
  });

  drawingCanvas.undoStack.onChange = syncButtonState;

  // Detect mock mode at page load — show badge if running without API key
  fetch('/api/recognize/status')
    .then((r) => r.json())
    .then((data: unknown) => {
      if (data && typeof data === 'object' && 'mockMode' in data && (data as { mockMode: boolean }).mockMode) {
        overlay.showMockBadge();
      }
    })
    .catch(() => {
      // Non-critical — swallow error
    });

  // Keyboard shortcut: Ctrl+Z / Cmd+Z for undo
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      drawingCanvas.undo();
    }
  });

  toolbar.appendChild(submitBtn);
  toolbar.appendChild(clearBtn);
  toolbar.appendChild(undoBtn);
  toolbar.appendChild(thicknessToggle);
  document.body.appendChild(toolbar);
}

init();
