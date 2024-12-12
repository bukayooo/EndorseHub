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

  // API middleware to ensure JSON responses
  const apiMiddleware = express.Router();
  apiMiddleware.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Create and setup API router
  const apiRouter = createApiRouter();
  setupAuth(apiRouter);

  // Mount API routes with JSON middleware
  app.use('/api', apiMiddleware, apiRouter);

  // Basic health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ 
      error: 'Not Found',
      message: 'The requested endpoint does not exist'
    });
  });

  return app;
}
