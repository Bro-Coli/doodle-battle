import { createRoot } from 'react-dom/client';

import { initApi } from './api/api.config';
import { App } from './App';
import { initEnv } from './env';
import { initGlobalFunctions } from './global';
import { initStyle } from './style';

import './style.css';

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
