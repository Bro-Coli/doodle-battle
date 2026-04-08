export const __DEV = import.meta.env.DEV;
export const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';

export function initEnv(): void {
  // Reserved for future public env wiring (e.g. import.meta.env.VITE_*).
}
