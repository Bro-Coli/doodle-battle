import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { initEnv } from './app/env';
import { initGlobalFunctions } from './app/global';
import { initStyle } from './app/style';
import { initApi } from './shared/api/api.config';

import './app/style.css';

// Side-effect import: registers window.__verifyColyseusSync for Phase 10 verification
import './network/ColyseusClient';

/* --------------------------------------------------
 *   Initializing Phase
 * ----------------------------------------------- */

initEnv();
initApi();
initGlobalFunctions();
initStyle();

/* --------------------------------------------------
 *   Root Entry Component Rendering
 * ----------------------------------------------- */

createRoot(document.getElementById('app')!).render(<App />);
