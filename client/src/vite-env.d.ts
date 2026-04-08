/// <reference types="vite/client" />

declare global {
  interface Window {
    __DEV?: boolean;
    __TODO?: (...args: unknown[]) => void;
    _err?: (...args: unknown[]) => void;
    _log?: (...args: unknown[]) => void;
    _warn?: (...args: unknown[]) => void;
  }
}

export {};
