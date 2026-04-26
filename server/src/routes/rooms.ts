import { Router } from 'express';
import { matchMaker } from '@colyseus/core';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rooms = await matchMaker.query({ name: 'game_room' });
    const joinable = rooms
      .filter((r) => !r.private && !r.locked && r.clients < r.maxClients)
      .map((r) => {
        const meta = (r.metadata ?? {}) as { drawingTime?: number };
        return {
          roomId: r.roomId,
          clients: r.clients,
          maxClients: r.maxClients,
          drawingTime: typeof meta.drawingTime === 'number' ? meta.drawingTime : null,
        };
      });
    res.json(joinable);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query rooms';
    res.status(500).json({ error: message });
  }
});

export default router;
