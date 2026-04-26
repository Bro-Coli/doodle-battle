import type { EntityProfile, MapType } from '@crayon-world/shared';
import { MOCK_ENTITIES } from '../mock-entities.js';
import { isMockMode } from '../routes/recognize.js';
import { getAnthropicClient } from './anthropicClient.js';
import { validateEntityProfile } from './validateProfile.js';
import { SYSTEM_PROMPT, buildUserContent } from './buildPrompt.js';

/**
 * Server-internal recognition function callable from GameRoom.
 * No caching — each round produces a fresh recognition.
 * Falls back to "Mystery Creature" (walking archetype) on any error.
 */
export async function recognizeDrawingInternal(
  imageDataUrl: string,
  mapType: MapType,
): Promise<EntityProfile> {
  // Mock mode: return random mock entity
  if (isMockMode()) {
    return MOCK_ENTITIES[Math.floor(Math.random() * MOCK_ENTITIES.length)];
  }

  // Real Anthropic call
  try {
    const base64 = imageDataUrl.replace(/^data:image\/[^;]+;base64,/, '');
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserContent(base64, mapType) as Parameters<
            typeof client.messages.create
          >[0]['messages'][0]['content'],
        },
      ],
    });

    const rawText =
      message.content[0]?.type === 'text'
        ? (message.content[0] as { type: 'text'; text: string }).text
        : '';

    // Extract JSON block in case of preamble
    let parsed: unknown;
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : rawText);
    } catch {
      parsed = null;
    }

    const validated = validateEntityProfile(parsed);
    if (validated) return validated;
  } catch {
    // Fall through to Mystery Creature fallback
  }

  // Mystery Creature fallback — gets a speed on whichever map we're on so it can still participate.
  return {
    name: 'Mystery Creature',
    archetype: 'walking',
    movementStyle: 'prowling',
    habitat: mapType,
    landSpeed: mapType === 'land' ? 3 : undefined,
    waterSpeed: mapType === 'water' ? 3 : undefined,
    airSpeed: mapType === 'sky' ? 3 : undefined,
    agility: 5,
    energy: 5,
    maxHealth: 30,
  };
}
