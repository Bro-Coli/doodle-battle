import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import cors from 'cors';
import recognizeRouter from './routes/recognize.js';
import interactionsRouter from './routes/interactions.js';
import { GameRoom } from './rooms/GameRoom.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: [/^http:\/\/localhost:\d+$/], credentials: true }));
app.use(express.json());
app.use('/api/recognize', recognizeRouter);
app.use('/api/interactions', interactionsRouter);

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
