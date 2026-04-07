import './style.css';
import { Application } from 'pixi.js';

async function init(): Promise<void> {
  // PixiJS v8 pattern: create Application, then await app.init()
  const app = new Application();
  await app.init({
    resizeTo: window,
    autoDensity: true,
    background: '#FFFFFF',
  });

  document.body.appendChild(app.canvas);

  // Create toolbar overlay with three disabled buttons
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

  toolbar.appendChild(submitBtn);
  toolbar.appendChild(clearBtn);
  toolbar.appendChild(undoBtn);
  document.body.appendChild(toolbar);
}

init();
