export function __TODO(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn('[TODO]', ...args);
  }
}

export const _err = (...args: unknown[]) => {
  console.error(...args);
};

export const _log = (...args: unknown[]) => {
  console.log(...args);
};

export const _warn = (...args: unknown[]) => {
  console.warn(...args);
};
