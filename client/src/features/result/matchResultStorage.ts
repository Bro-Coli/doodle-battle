/**
 * Session-scoped stash for the final match result. Shared between the
 * GameScreen (producer) and MatchResultScreen (consumer) so navigating to
 * `/result` survives a browser refresh without re-deriving data from the
 * Colyseus room state.
 *
 * The value is always the payload of the server's `game_finished` broadcast
 * plus the local player's session id, which together are enough to render
 * the result page.
 */

export type MatchResultPlayerStat = {
  name: string;
  team: string;
  entitiesDrawn: number;
  kills: number;
};

export type MatchResultPayload = {
  winner: string;
  stats: Record<string, MatchResultPlayerStat>;
  roundWins: { red: number; blue: number };
  mySessionId: string;
};

const STORAGE_KEY = 'crayonWorld:matchResult';

export function saveMatchResult(payload: MatchResultPayload): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (e.g. private mode quota); silently
    // ignore — the result page will redirect to `/` if no data is found.
  }
}

export function loadMatchResult(): MatchResultPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchResultPayload;
    if (
      typeof parsed?.winner === 'string' &&
      parsed?.stats &&
      parsed?.roundWins &&
      typeof parsed.roundWins.red === 'number' &&
      typeof parsed.roundWins.blue === 'number' &&
      typeof parsed?.mySessionId === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearMatchResult(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
