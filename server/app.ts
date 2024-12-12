import express from 'express';
import cors from 'cors';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';

export async function createApp() {
  try {
    const app = express();
    
    // Essential middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors({
      origin: process.env.NODE_ENV === 'development' ? true : false,
      credentials: true
    }));

    // Basic request logging
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    // Setup auth middleware (session)
    setupAuth(app);

    // Initialize and mount API router
    const apiRouter = createApiRouter();
    app.use('/api', apiRouter);

    // Simple status endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    // Global error handling
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
      });
    });

    return app;
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
}