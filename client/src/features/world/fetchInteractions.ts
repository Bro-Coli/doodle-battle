import { EntityProfile, InteractionMatrix } from '@crayon-world/shared/src/types';
import { apiUrl } from '@/shared/api/api.config';

/**
 * Client-side helper to POST entity profiles to the interactions API.
 *
 * @param profiles - All current entity profiles from the world stage
 * @returns Parsed InteractionMatrix from the server
 * @throws Error with HTTP status if the response is not ok
 */
export async function fetchInteractions(profiles: EntityProfile[]): Promise<InteractionMatrix> {
  const response = await fetch(apiUrl('/api/interactions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entities: profiles }),
  });

  if (!response.ok) {
    throw new Error(`Interactions API returned ${response.status}`);
  }

  return response.json() as Promise<InteractionMatrix>;
}
