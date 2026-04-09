import { __DEV, isBrowser } from './env';
import { __TODO, _err, _log, _warn } from '../shared/lib/logger';

/**
 * Attach frequently used dev helpers to `globalThis` (browser `window`).
 */
export function initGlobalFunctions(): void {
  if (isBrowser) {
    window.__DEV = __DEV;
    window.__TODO = __TODO;
    window._err = _err;
    window._log = _log;
    window._warn = _warn;
  }
}
