import express from 'express';
import cors from 'cors';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';

export async function createApp() {
  const app = express();
  
  // Essential middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS configuration
  const corsOptions = {
    origin: process.env.NODE_ENV === 'development' 
      ? true 
      : [process.env.FRONTEND_URL || ''].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
    optionsSuccessStatus: 200
  };
  
  app.use(cors(corsOptions));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Setup auth middleware
  setupAuth(app);

  // Mount API routes
  app.use('/api', createApiRouter());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Global error handling
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
      status: 'error'
    });
  });

  // Handle 404
  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Not Found', status: 'error' });
  });

  return app;
}