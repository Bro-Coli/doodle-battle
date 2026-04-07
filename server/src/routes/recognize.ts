import { Router } from 'express';
import type { EntityProfile } from '@crayon-world/shared';
import { MOCK_ENTITIES } from '../mock-entities.js';

const router = Router();

export function isMockMode(): boolean {
  return process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY;
}

router.post('/', (_req, res) => {
  if (isMockMode()) {
    const entity = MOCK_ENTITIES[Math.floor(Math.random() * MOCK_ENTITIES.length)] satisfies EntityProfile;
    res.json(entity);
    return;
  }
  // Phase 3: real Anthropic call goes here
  res.status(501).json({ error: 'Real AI not implemented yet' });
});

export default router;
