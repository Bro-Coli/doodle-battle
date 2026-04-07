import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import recognizeRouter from './routes/recognize.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/recognize', recognizeRouter);

app.listen(PORT, () => {
  const mockMode = process.env.MOCK_AI === 'true' || !process.env.ANTHROPIC_API_KEY;
  console.log(`Server on :${PORT} | mock=${mockMode}`);
});
