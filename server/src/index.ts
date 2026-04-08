import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import cors from 'cors';
import recognizeRouter from './routes/recognize.js';
import interactionsRouter from './routes/interactions.js';
import { GameRoom } from './rooms/GameRoom.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/recognize', recognizeRouter);
app.use('/api/interactions', interactionsRouter);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('game_room', GameRoom);

httpServer.listen(PORT, () => {
  const mockMode = process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY;
  console.log(`Server on :${PORT} | mock=${mockMode}`);
});
