import express from 'express';
import cors from 'cors';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';

export async function createApp() {
  const app = express();
  
  // Core middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS configuration for frontend separation
  // CORS configuration for frontend separation
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'https://testimonial-hub.repl.co'
      : ['http://localhost:5173', 'http://0.0.0.0:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  }));

  // Authentication setup
  setupAuth(app);

  // API routes - everything under /api
  app.use('/api', createApiRouter());

  // Health check endpoint (outside API namespace)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global error handlers
  app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    console.error('Server Error:', err);
    
    // Send JSON error for API routes, plain text for others
    const isApiRoute = _req.path.startsWith('/api');
    if (isApiRoute) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(500).send('Internal Server Error');
    }
  });

  return app;
}
