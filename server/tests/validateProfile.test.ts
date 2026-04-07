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
      speed: 7,
    });
    expect(result).toEqual({
      name: 'Wolf',
      archetype: 'walking',
      traits: ['predatory'],
      role: 'Apex predator',
      speed: 7,
    });
  });

  describe('speed validation', () => {
    it('includes speed when valid', () => {
      const result = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['predatory'],
        role: 'Apex predator',
        speed: 7,
      });
      expect(result).not.toBeNull();
      expect(result!.speed).toBe(7);
    });

    it('defaults speed to 5 when missing', () => {
      const result = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['predatory'],
        role: 'Apex predator',
      });
      expect(result).not.toBeNull();
      expect(result!.speed).toBe(5);
    });

    it('defaults speed to 5 when non-number', () => {
      const result = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['predatory'],
        role: 'Apex predator',
        speed: 'fast',
      });
      expect(result).not.toBeNull();
      expect(result!.speed).toBe(5);
    });

    it('clamps speed below 1 to 1', () => {
      const result0 = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['x'],
        role: 'y',
        speed: 0,
      });
      expect(result0!.speed).toBe(1);

      const resultNeg = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['x'],
        role: 'y',
        speed: -5,
      });
      expect(resultNeg!.speed).toBe(1);
    });

    it('clamps speed above 10 to 10', () => {
      const result11 = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['x'],
        role: 'y',
        speed: 11,
      });
      expect(result11!.speed).toBe(10);

      const result100 = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['x'],
        role: 'y',
        speed: 100,
      });
      expect(result100!.speed).toBe(10);
    });

    it('rounds fractional speed', () => {
      const result57 = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['x'],
        role: 'y',
        speed: 5.7,
      });
      expect(result57!.speed).toBe(6);

      const result32 = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        traits: ['x'],
        role: 'y',
        speed: 3.2,
      });
      expect(result32!.speed).toBe(3);
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
    expect(typeof blob.speed).toBe('number');
  });

  it('returns speed 5', () => {
    const blob = mysteryBlob();
    expect(blob.speed).toBe(5);
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
