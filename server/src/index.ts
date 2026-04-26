import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import cors from 'cors';
import recognizeRouter from './routes/recognize.js';
import interactionsRouter from './routes/interactions.js';
import roomsRouter from './routes/rooms.js';
import { GameRoom } from './rooms/GameRoom.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 3001;

const DEFAULT_FRONTEND_ORIGINS = new Set<string>([
  'https://doodlebattle.online',
  'https://www.doodlebattle.online',
]);

function isAllowedCorsOrigin(requestOrigin: string | undefined): boolean {
  if (requestOrigin == null) {
    return true;
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)$/.test(requestOrigin)) {
    return true;
  }
  if (DEFAULT_FRONTEND_ORIGINS.has(requestOrigin)) {
    return true;
  }
  for (const extra of (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)) {
    if (extra && extra === requestOrigin) {
      return true;
    }
  }
  if (/^https:\/\/.+\.vercel\.app$/i.test(requestOrigin)) {
    return true;
  }
  return false;
}

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      callback(null, isAllowedCorsOrigin(requestOrigin));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use('/api/recognize', recognizeRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/rooms', roomsRouter);

// Colyseus matchmaking HTTP endpoint — the SDK POSTs here to join/create rooms
app.post('/matchmake/:method/:roomName', async (req, res) => {
  try {
    const { method, roomName } = req.params;
    const options = req.body || {};

    let response: unknown;
    if (method === 'joinOrCreate') {
      response = await matchMaker.joinOrCreate(roomName, options);
    } else if (method === 'create') {
      response = await matchMaker.create(roomName, options);
    } else if (method === 'join') {
      response = await matchMaker.join(roomName, options);
    } else if (method === 'joinById') {
      response = await matchMaker.joinById(roomName, options);
    } else {
      res.status(404).json({ error: `Unknown method: ${method}` });
      return;
    }

    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Matchmaking failed';
    res.status(400).json({ error: message });
  }
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    maxPayload: 2 * 1024 * 1024, // 2MB — drawing PNGs can be 100KB-1MB
  }),
});

gameServer.define('game_room', GameRoom);

httpServer.listen(PORT, () => {
  const mockMode = process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY;
  console.log(`Server on :${PORT} | mock=${mockMode}`);
});
