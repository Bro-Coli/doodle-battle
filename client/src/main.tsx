import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { initEnv } from './app/env';
import { initGlobalFunctions } from './app/global';
import { initStyle } from './app/style';
import { hydrateDisplayName } from './features/lobby/displayNameStore';
import { initApi } from './shared/api/api.config';

import './app/style.css';
import './style/button.css';
import './style/badge.css';
import './style/slider.css';
import './style/select.css';
import './style/team.css';
import './style/panel.css';
import './style/invite.css';
import './style/modal.css';

// Eagerly initialize Colyseus client singleton
import './network/ColyseusClient';

/* --------------------------------------------------
 *   Initializing Phase
 * ----------------------------------------------- */

initEnv();
initApi();
initGlobalFunctions();
initStyle();
hydrateDisplayName();

/* --------------------------------------------------
 *   Root Entry Component Rendering
 * ----------------------------------------------- */

createRoot(document.getElementById('app')!).render(<App />);
