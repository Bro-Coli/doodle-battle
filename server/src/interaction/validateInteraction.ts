import type { InteractionMatrix, InteractionType } from '@crayon-world/shared';

const VALID_TYPES: InteractionType[] = ['chase', 'flee', 'fight', 'befriend', 'ignore'];

/**
 * Validates raw AI text and parses it into a typed InteractionMatrix.
 * Supports both old format (array) and new format (object with relationships + befriendLeaders).
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
    // Determine format by checking if the JSON starts with { or [
    const trimmed = rawText.trim();
    const startsWithObject = trimmed.startsWith('{');
    const startsWithArray = trimmed.startsWith('[');

    // Try new object format: { relationships: [...], befriendLeaders: {...} }
    if (startsWithObject) {
      const objMatch = rawText.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const parsed: unknown = JSON.parse(objMatch[0]);
        if (typeof parsed === 'object' && parsed !== null) {
          const obj = parsed as Record<string, unknown>;

          // Check if it's the new format with a "relationships" array
          if (Array.isArray(obj['relationships'])) {
            const relArray = obj['relationships'] as unknown[];
            if (relArray.length !== expectedCount) return null;

            // Validate relationship entries
            for (const entry of relArray) {
              if (typeof entry !== 'object' || entry === null) return null;
              const e = entry as Record<string, unknown>;
              if (typeof e['id'] !== 'number') return null;
              if (typeof e['relationships'] !== 'object' || e['relationships'] === null) return null;
              const rels = e['relationships'] as Record<string, unknown>;
              for (const val of Object.values(rels)) {
                if (!VALID_TYPES.includes(val as InteractionType)) return null;
              }
            }

            const typedRels = relArray as Array<{ id: number; relationships: Record<string, InteractionType> }>;

            // Parse befriendLeaders (optional)
            let befriendLeaders: Record<string, string> | undefined;
            if (typeof obj['befriendLeaders'] === 'object' && obj['befriendLeaders'] !== null) {
              const rawLeaders = obj['befriendLeaders'] as Record<string, unknown>;
              befriendLeaders = {};
              for (const [key, val] of Object.entries(rawLeaders)) {
                // Key should be "id1-id2", value should be a number (leader ID)
                if (typeof val === 'number') {
                  befriendLeaders[key] = String(val);
                }
              }
            }

            return {
              entries: typedRels.map((e) => ({
                entityId: String(e.id),
                relationships: e.relationships,
              })),
              befriendLeaders,
            };
          }
        }
      }
    }

    // Old array format: [{ id, relationships }, ...]
    if (startsWithArray || !startsWithObject) {
      const arrMatch = rawText.match(/\[[\s\S]*\]/);
      if (!arrMatch) return null;

      const parsed: unknown = JSON.parse(arrMatch[0]);

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
    }

    return null;
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
    befriendLeaders: {}, // No befriend relationships in fallback
  };
}
