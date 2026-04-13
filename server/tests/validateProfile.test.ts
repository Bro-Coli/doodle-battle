import { describe, it, expect, vi } from 'vitest';
import { validateEntityProfile, mysteryBlob } from '../src/recognition/validateProfile';

const VALID_ARCHETYPES = ['walking', 'flying', 'rooted', 'spreading', 'drifting', 'stationary'];

describe('validateEntityProfile', () => {
  it('returns a valid EntityProfile for well-formed input', () => {
    const result = validateEntityProfile({
      name: 'Wolf',
      archetype: 'walking',
      movementStyle: 'prowling',
      speed: 7,
      agility: 6,
      energy: 5,
      maxHealth: 45,
    });
    expect(result).toEqual({
      name: 'Wolf',
      archetype: 'walking',
      movementStyle: 'prowling',
      speed: 7,
      agility: 6,
      energy: 5,
      maxHealth: 45,
    });
  });

  describe('name normalization', () => {
    it('strips " or " alternatives and keeps the first option', () => {
      const result = validateEntityProfile({
        name: 'Eagle or Hawk',
        archetype: 'flying',
        movementStyle: 'swooping',
        speed: 7,
      });
      expect(result!.name).toBe('Eagle');
    });

    it('strips "/" alternatives', () => {
      const result = validateEntityProfile({
        name: 'dog/cat',
        archetype: 'walking',
        movementStyle: 'prowling',
      });
      expect(result!.name).toBe('Dog');
    });

    it('Title-Cases lowercase names', () => {
      const result = validateEntityProfile({
        name: 'red dragon',
        archetype: 'flying',
        movementStyle: 'flapping',
      });
      expect(result!.name).toBe('Red Dragon');
    });

    it('Title-Cases ALL-CAPS names', () => {
      const result = validateEntityProfile({
        name: 'DRAGON',
        archetype: 'flying',
        movementStyle: 'flapping',
      });
      expect(result!.name).toBe('Dragon');
    });

    it('handles hyphenated names', () => {
      const result = validateEntityProfile({
        name: 'saber-toothed tiger',
        archetype: 'walking',
        movementStyle: 'prowling',
      });
      expect(result!.name).toBe('Saber-Toothed Tiger');
    });
  });

  describe('movementStyle validation', () => {
    it('accepts a valid style for the archetype', () => {
      const result = validateEntityProfile({
        name: 'Hawk',
        archetype: 'flying',
        movementStyle: 'swooping',
      });
      expect(result!.movementStyle).toBe('swooping');
    });

    it('falls back to archetype default for invalid style', () => {
      const result = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
        movementStyle: 'swooping', // wrong archetype
      });
      expect(result!.movementStyle).toBe('prowling');
    });

    it('falls back to default when style is missing', () => {
      const result = validateEntityProfile({
        name: 'Wolf',
        archetype: 'walking',
      });
      expect(result!.movementStyle).toBe('prowling');
    });
  });

  describe('numeric clamping', () => {
    it('clamps speed to 1-10', () => {
      expect(validateEntityProfile({ name: 'X', archetype: 'walking', speed: 0 })!.speed).toBe(1);
      expect(validateEntityProfile({ name: 'X', archetype: 'walking', speed: 100 })!.speed).toBe(10);
    });

    it('clamps agility and energy to 1-10', () => {
      const r = validateEntityProfile({
        name: 'X',
        archetype: 'walking',
        agility: 99,
        energy: -5,
      });
      expect(r!.agility).toBe(10);
      expect(r!.energy).toBe(1);
    });

    it('clamps maxHealth to 1-100', () => {
      const r = validateEntityProfile({
        name: 'X',
        archetype: 'walking',
        maxHealth: 500,
      });
      expect(r!.maxHealth).toBe(100);
    });

    it('defaults speed/agility/energy to 5 and maxHealth to 30 when missing', () => {
      const r = validateEntityProfile({ name: 'X', archetype: 'walking' });
      expect(r!.speed).toBe(5);
      expect(r!.agility).toBe(5);
      expect(r!.energy).toBe(5);
      expect(r!.maxHealth).toBe(30);
    });

    it('rounds fractional values', () => {
      const r = validateEntityProfile({
        name: 'X',
        archetype: 'walking',
        speed: 5.7,
        maxHealth: 33.3,
      });
      expect(r!.speed).toBe(6);
      expect(r!.maxHealth).toBe(33);
    });
  });

  it('maps unknown archetype to "stationary"', () => {
    const result = validateEntityProfile({
      name: 'Wolf',
      archetype: 'unknown_type',
    });
    expect(result!.archetype).toBe('stationary');
    expect(result!.movementStyle).toBe('still');
  });

  it('returns null for null input', () => {
    expect(validateEntityProfile(null)).toBeNull();
  });

  it('returns null when name is missing or empty', () => {
    expect(validateEntityProfile({})).toBeNull();
    expect(validateEntityProfile({ name: '', archetype: 'walking' })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(validateEntityProfile('nope')).toBeNull();
    expect(validateEntityProfile(42)).toBeNull();
  });

  it('preserves all valid archetypes', () => {
    for (const archetype of VALID_ARCHETYPES) {
      const r = validateEntityProfile({ name: 'Entity', archetype });
      expect(r!.archetype).toBe(archetype);
    }
  });
});

describe('mysteryBlob', () => {
  it('returns a well-formed EntityProfile', () => {
    const blob = mysteryBlob();
    expect(blob.name).toBe('Mystery Blob');
    expect(VALID_ARCHETYPES).toContain(blob.archetype);
    expect(typeof blob.movementStyle).toBe('string');
    expect(blob.speed).toBe(5);
    expect(blob.agility).toBe(5);
    expect(blob.energy).toBe(5);
    expect(blob.maxHealth).toBe(30);
  });

  it('returns a random archetype', () => {
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValue(0);
    expect(mysteryBlob().archetype).toBe('walking');
    spy.mockReturnValue(0.5);
    expect(mysteryBlob().archetype).toBe('spreading');
    spy.mockRestore();
  });
});
