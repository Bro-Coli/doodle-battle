import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MOCK_ENTITIES } from '../src/mock-entities';
import { isMockMode } from '../src/routes/recognize';

describe('MOCK_ENTITIES', () => {
  it('contains exactly 6 entities, one per archetype', () => {
    expect(MOCK_ENTITIES).toHaveLength(6);
    const archetypes = MOCK_ENTITIES.map((e) => e.archetype);
    expect(archetypes).toContain('walking');
    expect(archetypes).toContain('flying');
    expect(archetypes).toContain('rooted');
    expect(archetypes).toContain('spreading');
    expect(archetypes).toContain('drifting');
    expect(archetypes).toContain('stationary');
  });

  it('each entity has all required EntityProfile fields', () => {
    for (const entity of MOCK_ENTITIES) {
      expect(typeof entity.name).toBe('string');
      expect(entity.name.length).toBeGreaterThan(0);
      expect(typeof entity.archetype).toBe('string');
      expect(Array.isArray(entity.traits)).toBe(true);
      expect(entity.traits.length).toBeGreaterThan(0);
      expect(typeof entity.role).toBe('string');
      expect(entity.role.length).toBeGreaterThan(0);
    }
  });
});

describe('isMockMode', () => {
  let savedApiKey: string | undefined;
  let savedMockAi: string | undefined;

  beforeEach(() => {
    savedApiKey = process.env.ANTHROPIC_API_KEY;
    savedMockAi = process.env.MOCK_AI;
  });

  afterEach(() => {
    if (savedApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = savedApiKey;
    }
    if (savedMockAi === undefined) {
      delete process.env.MOCK_AI;
    } else {
      process.env.MOCK_AI = savedMockAi;
    }
  });

  it('returns true when ANTHROPIC_API_KEY is undefined', () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.MOCK_AI;
    expect(isMockMode()).toBe(true);
  });

  it('returns true when MOCK_AI is "true" even if API key exists', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    process.env.MOCK_AI = 'true';
    expect(isMockMode()).toBe(true);
  });

  it('returns false when MOCK_AI is not "true" and ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    process.env.MOCK_AI = 'false';
    expect(isMockMode()).toBe(false);
  });
});
