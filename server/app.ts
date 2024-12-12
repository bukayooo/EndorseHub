import express from 'express';
import cors from 'cors';
import { createApiRouter } from './routes';
import { setupAuth } from './auth';

export async function createApp() {
  const app = express();
  
  // Essential middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://testimonialhub.repl.co'
      : 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['set-cookie']
  }));

  // Create API router first
  const apiRouter = createApiRouter();
  
  // Setup authentication on the API router
  setupAuth(apiRouter);

  // Mount all API routes under /api
  app.use('/api', apiRouter);

  // Basic health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err: any, _req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  return app;
}
