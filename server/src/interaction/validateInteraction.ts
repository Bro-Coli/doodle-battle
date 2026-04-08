import type { InteractionMatrix, InteractionType } from '@crayon-world/shared';

const VALID_TYPES: InteractionType[] = ['chase', 'flee', 'fight', 'befriend', 'ignore'];

/**
 * Validates raw AI text and parses it into a typed InteractionMatrix.
 * Extracts the JSON array with a regex to handle any preamble from the model.
 *
 * @param rawText - Raw string response from the AI
 * @param expectedCount - Expected number of entity entries in the matrix
 * @returns A valid InteractionMatrix, or null if parsing/validation fails
 */
export function validateInteractionResponse(
  rawText: string,
  expectedCount: number
): InteractionMatrix | null {
  try {
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) return null;

    const parsed: unknown = JSON.parse(match[0]);

    if (!Array.isArray(parsed) || parsed.length !== expectedCount) return null;

    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) return null;

      const e = entry as Record<string, unknown>;

      if (typeof e['id'] !== 'number') return null;
      if (typeof e['relationships'] !== 'object' || e['relationships'] === null) return null;

      const rels = e['relationships'] as Record<string, unknown>;
      for (const val of Object.values(rels)) {
        if (!VALID_TYPES.includes(val as InteractionType)) return null;
      }
    }

    const typedParsed = parsed as Array<{ id: number; relationships: Record<string, InteractionType> }>;

    return {
      entries: typedParsed.map((e) => ({
        entityId: String(e.id),
        relationships: e.relationships,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Fallback matrix that assigns 'ignore' for all entity pairs.
 * Used when both AI attempts fail to produce a valid matrix.
 *
 * @param entities - Array of entities with at least an id field
 * @returns An InteractionMatrix where every entity ignores every other entity
 */
export function ignoreFallback(entities: Array<{ id: number }>): InteractionMatrix {
  return {
    entries: entities.map((entity) => ({
      entityId: String(entity.id),
      relationships: Object.fromEntries(
        entities
          .filter((other) => other.id !== entity.id)
          .map((other) => [String(other.id), 'ignore' as InteractionType])
      ),
    })),
  };
}
