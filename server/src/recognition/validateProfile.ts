import type { Archetype, EntityProfile, Habitat, MovementStyle } from '@crayon-world/shared';
import {
  STYLES_BY_ARCHETYPE,
  DEFAULT_STYLE_BY_ARCHETYPE,
} from '@crayon-world/shared';

const VALID_ARCHETYPES: Archetype[] = [
  'walking',
  'flying',
  'rooted',
  'drifting',
  'stationary',
];

const VALID_HABITATS: Habitat[] = ['land', 'water', 'sky'];

/** Strip disjunctives and hedges from a recognition name ("Eagle or Hawk" → "Eagle"). */
function normalizeName(raw: string): string {
  let n = raw.trim();

  // Strip everything after a disjunctive separator. Order matters: longer first.
  const splitters = [' or ', ' / ', '/', ' and ', ',', ';', ' | ', '|'];
  for (const sep of splitters) {
    const idx = n.toLowerCase().indexOf(sep);
    if (idx > 0) {
      n = n.slice(0, idx).trim();
    }
  }

  // Remove trailing punctuation.
  n = n.replace(/[.?!]+$/, '').trim();

  // Title Case — each whitespace-separated word, preserving internal apostrophes/hyphens.
  n = n
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      // Capitalize first letter of each hyphen-separated segment
      return word
        .split('-')
        .map((seg) => (seg.length === 0 ? seg : seg[0].toUpperCase() + seg.slice(1).toLowerCase()))
        .join('-');
    })
    .join(' ');

  return n;
}

/** Clamp a 1-10 integer with a default fallback. */
function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.round(Math.max(min, Math.min(max, raw)));
}

/** Optional 1-10 field: undefined stays undefined; numbers clamp; other → undefined. */
function optionalSpeed(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return Math.round(Math.max(1, Math.min(10, raw)));
}

/**
 * Pure type guard for EntityProfile.
 * - Returns a valid EntityProfile on success.
 * - Maps unknown archetypes to "stationary" (locked decision).
 * - Normalizes names to Title Case and strips disjunctives ("X or Y" → "X").
 * - Falls movementStyle back to the archetype default if missing/mismatched.
 * - Clamps numerics to their valid ranges.
 * - Returns null if name is missing/empty.
 */
export function validateEntityProfile(raw: unknown): EntityProfile | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) return null;
  const name = normalizeName(obj['name']);
  if (name.length === 0) return null;

  // Unknown archetype maps to 'stationary' per locked decision
  const archetype: Archetype = VALID_ARCHETYPES.includes(obj['archetype'] as Archetype)
    ? (obj['archetype'] as Archetype)
    : 'stationary';

  // movementStyle: validate against archetype's allowed styles; fall back to default
  const allowedStyles = STYLES_BY_ARCHETYPE[archetype];
  const rawStyle = obj['movementStyle'];
  const movementStyle: MovementStyle =
    typeof rawStyle === 'string' && (allowedStyles as readonly string[]).includes(rawStyle)
      ? (rawStyle as MovementStyle)
      : DEFAULT_STYLE_BY_ARCHETYPE[archetype];

  // Habitat — default to 'land' if missing/invalid.
  const habitat: Habitat = VALID_HABITATS.includes(obj['habitat'] as Habitat)
    ? (obj['habitat'] as Habitat)
    : 'land';

  let landSpeed = optionalSpeed(obj['landSpeed']);
  let waterSpeed = optionalSpeed(obj['waterSpeed']);
  let airSpeed = optionalSpeed(obj['airSpeed']);

  // Guarantee the home-habitat speed exists so every creature can move on its own map.
  if (habitat === 'land' && landSpeed === undefined) landSpeed = 5;
  if (habitat === 'water' && waterSpeed === undefined) waterSpeed = 5;
  if (habitat === 'sky' && airSpeed === undefined) airSpeed = 5;

  // Fliers must have a landSpeed so they can be grounded on land maps.
  if (archetype === 'flying' && landSpeed === undefined) landSpeed = 2;

  const agility = clampInt(obj['agility'], 1, 10, 5);
  const energy = clampInt(obj['energy'], 1, 10, 5);
  const maxHealth = clampInt(obj['maxHealth'], 1, 100, 30);

  return {
    name,
    archetype,
    movementStyle,
    habitat,
    ...(landSpeed !== undefined ? { landSpeed } : {}),
    ...(waterSpeed !== undefined ? { waterSpeed } : {}),
    ...(airSpeed !== undefined ? { airSpeed } : {}),
    agility,
    energy,
    maxHealth,
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
    movementStyle: DEFAULT_STYLE_BY_ARCHETYPE[archetype],
    habitat: 'land',
    landSpeed: 5,
    waterSpeed: 3,
    agility: 5,
    energy: 5,
    maxHealth: 30,
  };
}
