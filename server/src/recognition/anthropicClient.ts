import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

/**
 * Lazy-initialized Anthropic SDK singleton.
 * Hard timeout of 30 seconds matches the locked decision in CONTEXT.md.
 * API key is read from process.env at first call (not module load time).
 */
export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30_000,
    });
  }
  return _client;
}
