import type { EntityProfile, InteractionMatrix } from '@crayon-world/shared';
import { isMockMode } from '../routes/recognize.js';
import { getAnthropicClient } from '../recognition/anthropicClient.js';
import {
  INTERACTION_SYSTEM_PROMPT,
  buildInteractionUserContent,
} from './buildInteractionPrompt.js';
import {
  validateInteractionResponse,
  ignoreFallback,
} from './validateInteraction.js';
import { buildMockMatrix } from '../mock-interactions.js';

/**
 * Server-internal interaction classification callable from GameRoom.
 * Deduplicates by name, calls Claude Haiku (or returns mock), validates.
 * Falls back to all-ignore on any error.
 */
export async function fetchInteractionsInternal(
  profiles: EntityProfile[],
): Promise<InteractionMatrix> {
  // Deduplicate by name
  const seen = new Set<string>();
  const uniqueProfiles: EntityProfile[] = [];
  for (const profile of profiles) {
    if (!seen.has(profile.name)) {
      seen.add(profile.name);
      uniqueProfiles.push(profile);
    }
  }

  // Single entity or empty: no relationships
  if (uniqueProfiles.length <= 1) {
    return { entries: [] };
  }

  // Mock mode — build the matrix from the actual entities' names so Fire's row
  // doesn't end up applied to whichever entity happened to land in slot 3.
  if (isMockMode()) {
    return buildMockMatrix(uniqueProfiles);
  }

  // Build prompt entities with stable integer IDs
  const promptEntities = uniqueProfiles.map((profile, index) => ({
    id: index,
    name: profile.name,
    role: profile.role,
  }));

  try {
    const client = getAnthropicClient();

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

      const validated = validateInteractionResponse(rawText, promptEntities.length);
      if (validated !== null) return validated;
    }
  } catch (err) {
    console.error('[fetchInteractionsInternal] error:', err);
  }

  // Fallback: all-ignore
  return ignoreFallback(promptEntities);
}
