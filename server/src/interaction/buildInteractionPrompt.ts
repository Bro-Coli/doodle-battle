/**
 * System prompt and user message construction for Claude Haiku interaction classification.
 * Uses stable integer IDs (not names) as keys to prevent Haiku from rewriting entity names.
 * Strict JSON-only output to prevent preamble.
 */

export const INTERACTION_SYSTEM_PROMPT = `You are an ecological interaction classifier for a drawing game.
You will receive a list of entities with integer IDs. Classify how each entity behaves toward every other entity based on real-world ecology, mythology, or intuitive logic.

Respond with ONLY a JSON object matching this schema:
{
  "relationships": [       // Array of entity relationship entries
    {
      "id": number,        // The entity's integer ID (as given)
      "relationships": {   // One key per other entity ID (as string)
        "[otherId]": "chase" | "flee" | "fight" | "befriend" | "ignore"
      }
    }
  ],
  "befriendLeaders": {     // For each befriend pair, which entity naturally leads?
    "[smallerId]-[largerId]": number  // The leader's ID (the one others follow)
  }
}

Interaction type definitions:
- "chase"   — actively pursues the other (predator, hungry, territorial aggressor)
- "flee"    — actively avoids the other (prey, threatened, weaker)
- "fight"   — engages in conflict (rivals, equal-strength adversaries)
- "befriend"— moves toward cooperatively (symbiosis, mutualism, attraction)
- "ignore"  — no strong behavioral response

For befriendLeaders: when two entities befriend each other, one naturally leads and the other follows. Pick the leader based on:
- Dominant species leads (human leads dog, shepherd leads sheep)
- Larger/stronger entity leads (elephant leads bird)
- More intelligent entity leads (dolphin leads fish)
- If truly equal (two cats), pick either one

Rules:
- Relationships are asymmetric: A may chase B while B flees A.
- Every entity must have a relationship entry for every other entity (no omissions).
- befriendLeaders key format is always "smallerId-largerId" (e.g., "1-3" not "3-1").
- Only include befriendLeaders entries for mutual befriend pairs.
- Base decisions on real-world ecology, physics, or intuitive logic.
- Do not include any text outside the JSON object. JSON only.`;

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
