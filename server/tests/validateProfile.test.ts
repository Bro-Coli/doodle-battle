import { describe, it, expect, vi } from 'vitest';
import { validateEntityProfile, mysteryBlob } from '../src/recognition/validateProfile';

const VALID_ARCHETYPES = ['walking', 'flying', 'rooted', 'spreading', 'drifting', 'stationary'];

describe('validateEntityProfile', () => {
  it('returns valid EntityProfile for well-formed input', () => {
    const result = validateEntityProfile({
      name: 'Wolf',
      archetype: 'walking',
      traits: ['predatory'],
      role: 'Apex predator',
    });
    expect(result).toEqual({
      name: 'Wolf',
      archetype: 'walking',
      traits: ['predatory'],
      role: 'Apex predator',
    });
  });

  it('maps unknown archetype to "stationary"', () => {
    const result = validateEntityProfile({
      name: 'Wolf',
      archetype: 'unknown_type',
      traits: ['x'],
      role: 'y',
    });
    expect(result).not.toBeNull();
    expect(result!.archetype).toBe('stationary');
  });

  it('returns null for null input', () => {
    expect(validateEntityProfile(null)).toBeNull();
  });

  it('returns null for empty object (missing required fields)', () => {
    expect(validateEntityProfile({})).toBeNull();
  });

  it('returns null when name is empty string', () => {
    expect(
      validateEntityProfile({ name: '', archetype: 'walking', traits: ['x'], role: 'y' }),
    ).toBeNull();
  });

  it('returns null when traits is empty array', () => {
    expect(
      validateEntityProfile({ name: 'Wolf', archetype: 'walking', traits: [], role: 'x' }),
    ).toBeNull();
  });

  it('returns null when role is empty string', () => {
    expect(
      validateEntityProfile({ name: 'Wolf', archetype: 'walking', traits: ['x'], role: '' }),
    ).toBeNull();
  });

  it('returns null for non-object input (string)', () => {
    expect(validateEntityProfile('not an object')).toBeNull();
  });

  it('returns null for non-object input (number)', () => {
    expect(validateEntityProfile(42)).toBeNull();
  });

  it('validates traits must be array of strings', () => {
    const result = validateEntityProfile({
      name: 'Wolf',
      archetype: 'walking',
      traits: [1, 2],
      role: 'Apex predator',
    });
    // traits contains non-strings — should return null
    expect(result).toBeNull();
  });

  it('preserves all valid archetypes', () => {
    for (const archetype of VALID_ARCHETYPES) {
      const result = validateEntityProfile({
        name: 'Entity',
        archetype,
        traits: ['trait'],
        role: 'A role',
      });
      expect(result).not.toBeNull();
      expect(result!.archetype).toBe(archetype);
    }
  });
});

describe('mysteryBlob', () => {
  it('returns an EntityProfile with name "Mystery Blob"', () => {
    const blob = mysteryBlob();
    expect(blob.name).toBe('Mystery Blob');
  });

  it('returns a valid EntityProfile structure', () => {
    const blob = mysteryBlob();
    expect(typeof blob.name).toBe('string');
    expect(VALID_ARCHETYPES).toContain(blob.archetype);
    expect(Array.isArray(blob.traits)).toBe(true);
    expect(blob.traits.length).toBeGreaterThan(0);
    expect(typeof blob.role).toBe('string');
    expect(blob.role.length).toBeGreaterThan(0);
  });

  it('returns a random archetype from all 6 archetypes', () => {
    // Use spyOn to control Math.random
    const spy = vi.spyOn(Math, 'random');

    spy.mockReturnValue(0); // index 0 = 'walking'
    expect(mysteryBlob().archetype).toBe('walking');

    spy.mockReturnValue(0.16); // index 0
    expect(mysteryBlob().archetype).toBe('walking');

    spy.mockReturnValue(0.17); // index 1 = 'flying'
    expect(mysteryBlob().archetype).toBe('flying');

    spy.mockReturnValue(0.5); // index 3 = 'spreading'
    expect(mysteryBlob().archetype).toBe('spreading');

    spy.mockReturnValue(0.999); // index 5 = 'stationary'
    expect(mysteryBlob().archetype).toBe('stationary');

    spy.mockRestore();
  });
});
