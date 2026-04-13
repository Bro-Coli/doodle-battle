import { Router } from 'express';
import type { EntityProfile } from '@crayon-world/shared';
import { isMockMode } from './recognize.js';
import { getAnthropicClient } from '../recognition/anthropicClient.js';
import {
  INTERACTION_SYSTEM_PROMPT,
  buildInteractionUserContent,
} from '../interaction/buildInteractionPrompt.js';
import {
  validateInteractionResponse,
  ignoreFallback,
} from '../interaction/validateInteraction.js';
import { buildMockMatrix } from '../mock-interactions.js';

const router = Router();

router.post('/', async (req, res) => {
  // --- Input validation ---
  const { entities } = req.body as { entities?: unknown };

  if (!Array.isArray(entities) || entities.length === 0) {
    res.status(400).json({ error: 'entities must be a non-empty array' });
    return;
  }

  // --- Single entity edge case: no relationships possible ---
  const profiles = entities as EntityProfile[];

  // --- Deduplicate by name (case-sensitive) ---
  const seen = new Set<string>();
  const uniqueProfiles: EntityProfile[] = [];
  for (const profile of profiles) {
    if (!seen.has(profile.name)) {
      seen.add(profile.name);
      uniqueProfiles.push(profile);
    }
  }

  // After deduplication, if only 1 entity remains: no relationships
  if (uniqueProfiles.length <= 1) {
    res.json({ entries: [] });
    return;
  }

  // --- Mock mode — build a name-based matrix for the actual entities present,
  // rather than returning a fixed positional one that assumes the exact 6 mock
  // entities in a specific order.
  if (isMockMode()) {
    res.json(buildMockMatrix(uniqueProfiles));
    return;
  }

  // Build the prompt entities with stable integer IDs
  const promptEntities = uniqueProfiles.map((profile, index) => ({
    id: index,
    name: profile.name,
    role: profile.role,
  }));

  if (promptEntities.length > 10) {
    console.warn(
      `[interactions] Warning: ${promptEntities.length} unique entities exceeds recommended cap of 10. Prompt may be large.`
    );
  }

  // --- Real Anthropic call with retry ---
  try {
    const client = getAnthropicClient();
    let validated = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: INTERACTION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildInteractionUserContent(promptEntities),
          },
        ],
      });

      const rawText =
        message.content[0]?.type === 'text'
          ? (message.content[0] as { type: 'text'; text: string }).text
          : '';

      validated = validateInteractionResponse(rawText, promptEntities.length);
      if (validated !== null) {
        res.json(validated);
        return;
      }
    }

    // Both attempts failed validation — return all-ignore fallback
    res.json(ignoreFallback(promptEntities));
  } catch (err) {
    console.error('Interaction classification error:', err);
    res.status(502).json({ error: 'Interaction classification failed' });
  }
});

export default router;
