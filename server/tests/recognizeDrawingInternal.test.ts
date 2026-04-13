import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the recognition modules
vi.mock('../src/routes/recognize.js', () => ({
  isMockMode: vi.fn(),
}));

vi.mock('../src/recognition/anthropicClient.js', () => ({
  getAnthropicClient: vi.fn(),
}));

vi.mock('../src/mock-entities.js', () => ({
  MOCK_ENTITIES: [
    {
      name: 'Wolf',
      archetype: 'walking',
      movementStyle: 'prowling',
      speed: 7,
      agility: 6,
      energy: 5,
      maxHealth: 45,
    },
  ],
}));

import { isMockMode } from '../src/routes/recognize.js';
import { getAnthropicClient } from '../src/recognition/anthropicClient.js';
import { recognizeDrawingInternal } from '../src/recognition/recognizeDrawingInternal.js';

describe('recognizeDrawingInternal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a mock entity in mock mode', async () => {
    vi.mocked(isMockMode).mockReturnValue(true);

    const result = await recognizeDrawingInternal('data:image/png;base64,abc123');
    expect(result.name).toBe('Wolf');
    expect(result.archetype).toBe('walking');
    expect(result.speed).toBe(7);
  });

  it('returns Mystery Creature fallback on API error', async () => {
    vi.mocked(isMockMode).mockReturnValue(false);
    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('API failure')),
      },
    };
    vi.mocked(getAnthropicClient).mockReturnValue(mockClient as never);

    const result = await recognizeDrawingInternal('data:image/png;base64,abc123');
    expect(result.name).toBe('Mystery Creature');
    expect(result.archetype).toBe('walking');
    expect(result.speed).toBe(3);
    expect(result.movementStyle).toBe('prowling');
  });

  it('returns Mystery Creature fallback on malformed JSON response', async () => {
    vi.mocked(isMockMode).mockReturnValue(false);
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'not valid json at all' }],
        }),
      },
    };
    vi.mocked(getAnthropicClient).mockReturnValue(mockClient as never);

    const result = await recognizeDrawingInternal('data:image/png;base64,abc123');
    expect(result.name).toBe('Mystery Creature');
    expect(result.archetype).toBe('walking');
  });

  it('returns validated profile on successful API call', async () => {
    vi.mocked(isMockMode).mockReturnValue(false);
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'Dragon',
                archetype: 'flying',
                movementStyle: 'flapping',
                speed: 9,
                agility: 5,
                energy: 6,
                maxHealth: 90,
              }),
            },
          ],
        }),
      },
    };
    vi.mocked(getAnthropicClient).mockReturnValue(mockClient as never);

    const result = await recognizeDrawingInternal('data:image/png;base64,abc123');
    expect(result.name).toBe('Dragon');
    expect(result.archetype).toBe('flying');
    expect(result.speed).toBe(9);
  });

  it('strips data URL prefix before sending to API', async () => {
    vi.mocked(isMockMode).mockReturnValue(false);
    let capturedBase64 = '';
    const mockClient = {
      messages: {
        create: vi.fn().mockImplementation((params: unknown) => {
          const p = params as { messages: { content: { source?: { data: string } }[] }[] };
          capturedBase64 = p.messages[0].content[0].source?.data ?? '';
          return Promise.resolve({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  name: 'Cat',
                  archetype: 'walking',
                  movementStyle: 'prowling',
                  speed: 5,
                  agility: 6,
                  energy: 5,
                  maxHealth: 20,
                }),
              },
            ],
          });
        }),
      },
    };
    vi.mocked(getAnthropicClient).mockReturnValue(mockClient as never);

    await recognizeDrawingInternal('data:image/png;base64,RAWBASE64DATA');
    expect(capturedBase64).toBe('RAWBASE64DATA');
    expect(capturedBase64).not.toContain('data:image');
  });
});
