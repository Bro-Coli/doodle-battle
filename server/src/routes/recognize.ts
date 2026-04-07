import { Router } from 'express';
import type { EntityProfile } from '@crayon-world/shared';
import { MOCK_ENTITIES } from '../mock-entities.js';
import { getAnthropicClient } from '../recognition/anthropicClient.js';
import { validateEntityProfile, mysteryBlob } from '../recognition/validateProfile.js';
import { SYSTEM_PROMPT, buildUserContent } from '../recognition/buildPrompt.js';

const router = Router();

// In-memory cache keyed by entity name (lowercase).
// Cache key is only known after Claude responds — no pre-call lookup.
const profileCache = new Map<string, EntityProfile>();

export function isMockMode(): boolean {
  return process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY;
}

router.post('/', async (req, res) => {
  // --- Mock mode ---
  if (isMockMode()) {
    const entity = MOCK_ENTITIES[Math.floor(Math.random() * MOCK_ENTITIES.length)] satisfies EntityProfile;
    res.json(entity);
    return;
  }

  // --- Input validation ---
  const { imageDataUrl } = req.body as { imageDataUrl?: unknown };
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    res.status(400).json({ error: 'imageDataUrl required' });
    return;
  }

  // --- Real Anthropic call ---
  try {
    const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserContent(base64) as Parameters<typeof client.messages.create>[0]['messages'][0]['content'],
        },
      ],
    });

    const rawText =
      message.content[0]?.type === 'text' ? (message.content[0] as { type: 'text'; text: string }).text : '';

    // Try to extract JSON block in case of any preamble (pitfall 4)
    let parsed: unknown;
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : rawText);
    } catch {
      parsed = null;
    }

    const validated = validateEntityProfile(parsed);
    const profile = validated ?? mysteryBlob();

    // Post-call cache: store by name; return cached version if already exists
    const cacheKey = profile.name.toLowerCase();
    const existing = profileCache.get(cacheKey);
    if (existing) {
      res.json(existing);
      return;
    }
    profileCache.set(cacheKey, profile);
    res.json(profile);
  } catch {
    res.status(502).json({ error: 'Recognition failed' });
  }
});

export default router;
