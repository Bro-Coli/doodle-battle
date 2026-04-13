/**
 * System prompt and user message construction for Claude Haiku interaction classification.
 * Uses stable integer IDs (not names) as keys to prevent Haiku from rewriting entity names.
 * Strict JSON-only output to prevent preamble.
 */

export const INTERACTION_SYSTEM_PROMPT = `You are an ecological interaction classifier for a drawing game.
You will receive a list of entities with integer IDs. Classify how each entity behaves toward every other entity based on real-world ecology, mythology, or intuitive logic.

Respond with ONLY a JSON array. Each element must match this schema exactly:
{
  "id": number,          // The entity's integer ID (as given)
  "relationships": {     // One key per other entity ID (as string)
    "[otherId]": "chase" | "flee" | "fight" | "befriend" | "ignore"
  }
}

Interaction type definitions:
- "chase"   — actively pursues the other (predator, hungry, territorial aggressor)
- "flee"    — actively avoids the other (prey, threatened, weaker)
- "fight"   — engages in conflict (rivals, equal-strength adversaries)
- "befriend"— moves toward cooperatively (symbiosis, mutualism, attraction)
- "ignore"  — no strong behavioral response

Rules:
- Relationships are asymmetric: A may chase B while B flees A.
- Every entity must have a relationship entry for every other entity (no omissions).
- Base decisions on real-world ecology, physics, or intuitive logic.
- Do not include any text outside the JSON array. JSON only.`;

/**
 * Builds the user message text for the interaction classification prompt.
 * Entities use stable integer IDs so Haiku cannot rewrite names.
 *
 * @param entities - Array of entities with id and name
 * @returns User content string to send as the user message
 */
export function buildInteractionUserContent(
  entities: Array<{ id: number; name: string }>
): string {
  const lines = entities.map((e) => `- id ${e.id}: ${e.name}`);
  return `Classify interactions for these entities:\n${lines.join('\n')}`;
}
