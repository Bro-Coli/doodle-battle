/**
 * System prompt and user message construction for Claude Haiku sketch recognition.
 * Open vocabulary — Claude names whatever it sees without restrictions.
 * Strict JSON-only output to prevent preamble and refusals.
 */

export const SYSTEM_PROMPT = `You are an entity classifier for a drawing game.
The player submits a freehand sketch. Respond with ONLY a JSON object matching this schema exactly:
{
  "name": string,       // The thing you see, in plain English (open vocabulary — name anything)
  "archetype": "walking" | "flying" | "rooted" | "spreading" | "drifting" | "stationary",
  "traits": string[],   // 2–4 short descriptive traits (non-empty array)
  "role": string        // One sentence describing the entity's role in nature or the world
}
If the drawing is unclear or unrecognizable, make your best guess. Do not refuse, apologize, or explain. Do not include any text outside the JSON object. JSON only.`;

/**
 * Builds the user message content array for the Anthropic Messages API.
 * Includes an image block (base64 PNG) and a text prompt.
 *
 * @param base64 - Raw base64 string (data URL prefix already stripped)
 */
export function buildUserContent(base64: string): Array<{
  type: 'image' | 'text';
  source?: { type: 'base64'; media_type: 'image/png'; data: string };
  text?: string;
}> {
  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: base64,
      },
    },
    {
      type: 'text',
      text: 'Identify this sketch.',
    },
  ];
}
