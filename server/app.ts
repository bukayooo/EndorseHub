import express from 'express';
import cors from 'cors';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';

export async function createApp() {
  const app = express();
  
  // Core middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS configuration for local development
  app.use(cors({
    origin: 'http://0.0.0.0:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  }));

  // Authentication setup
  setupAuth(app);

  // API routes - everything under /api
  const apiRouter = createApiRouter();
  app.use('/api', apiRouter);

  // Health check endpoint (outside API namespace)
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    
    console.error('Server Error:', err);
    
    // Always return JSON for consistency
    res.status(500).json({
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
  });

  return app;
}
