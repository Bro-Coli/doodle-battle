import { useSyncExternalStore } from 'react';

const DISPLAY_NAME_STORAGE_KEY = 'doodle_battle_display_name';
const MAX_DISPLAY_NAME_LENGTH = 16;

type DisplayNameState = {
  displayName: string;
  isHydrated: boolean;
};

let state: DisplayNameState = {
  displayName: '',
  isHydrated: false,
};

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setState(next: DisplayNameState): void {
  state = next;
  emit();
}

export function hydrateDisplayName(): void {
  if (state.isHydrated) return;

  if (typeof window === 'undefined') {
    setState({ ...state, isHydrated: true });
    return;
  }

  const saved = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ?? '';
  const normalized = saved.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  setState({
    displayName: normalized,
    isHydrated: true,
  });
}

export function setDisplayName(name: string): void {
  const normalized = name.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  if (typeof window !== 'undefined') {
    if (normalized) window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, normalized);
    else window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
  }

  setState({
    ...state,
    displayName: normalized,
  });
}

export function clearDisplayName(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
  }

  setState({
    ...state,
    displayName: '',
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDisplayNameStore<T>(selector: (store: DisplayNameState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}
