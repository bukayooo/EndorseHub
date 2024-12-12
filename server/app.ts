import express from 'express';
import cors from 'cors';
import { createApiRouter } from './routes';

export async function createApp() {
  const app = express();
  
  // Essential middleware
  app.use(express.json());
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://testimonialhub.repl.co'
      : 'http://localhost:5173',
    credentials: true
  }));

  // API routes
  const apiRouter = createApiRouter();
  app.use('/api', apiRouter);

  // Basic health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
