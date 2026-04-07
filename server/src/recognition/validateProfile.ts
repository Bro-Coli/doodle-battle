import type { Archetype, EntityProfile } from '@crayon-world/shared';

const VALID_ARCHETYPES: Archetype[] = [
  'walking',
  'flying',
  'rooted',
  'spreading',
  'drifting',
  'stationary',
];

/**
 * Pure type guard for EntityProfile.
 * - Returns a valid EntityProfile on success.
 * - Maps unknown archetypes to "stationary" (locked decision).
 * - Returns null if required fields are missing, empty, or wrong type.
 */
export function validateEntityProfile(raw: unknown): EntityProfile | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) return null;

  if (typeof obj['role'] !== 'string' || obj['role'].length === 0) return null;

  if (
    !Array.isArray(obj['traits']) ||
    obj['traits'].length === 0 ||
    !obj['traits'].every((t) => typeof t === 'string')
  ) {
    return null;
  }

  // Unknown archetype maps to 'stationary' per locked decision
  const archetype: Archetype = VALID_ARCHETYPES.includes(obj['archetype'] as Archetype)
    ? (obj['archetype'] as Archetype)
    : 'stationary';

  // Speed: valid number in 1-10 clamped and rounded; non-number defaults to 5
  const rawSpeed = obj['speed'];
  const speed =
    typeof rawSpeed === 'number'
      ? Math.round(Math.max(1, Math.min(10, rawSpeed)))
      : 5;

  return {
    name: obj['name'] as string,
    archetype,
    traits: obj['traits'] as string[],
    role: obj['role'] as string,
    speed,
  };
}

/**
 * Fallback entity returned when Claude returns malformed JSON or unrecognizable input.
 * Random archetype for maximum variety.
 */
export function mysteryBlob(): EntityProfile {
  const archetype = VALID_ARCHETYPES[Math.floor(Math.random() * VALID_ARCHETYPES.length)];
  return {
    name: 'Mystery Blob',
    archetype,
    traits: ['mysterious', 'amorphous'],
    role: 'An unidentifiable entity',
    speed: 5,
  };
}
