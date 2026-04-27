const DEFAULT_API_URL = import.meta.env.DEV
  ? 'http://localhost:3001'
  : 'https://api.doodlebattle.online';

export const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export function apiUrl(path: string): string {
  return new URL(path, API_URL).toString();
}

export function initApi(): void {
  // Reserved for future API bootstrap work.
}
