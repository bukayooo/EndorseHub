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
    exposedHeaders: ['Set-Cookie'],
  }));

  // Initialize authentication first - this sets up session handling
  await setupAuth(app);

  // Request logging middleware
  app.use((req, res, next) => {
    const authStatus = req.isAuthenticated?.() || false;
    const userId = req.user?.id;
    console.log(`[${req.method}] ${req.path} - Auth: ${authStatus}, User: ${userId || 'none'}`);
    next();
  });

  // Response formatting middleware
  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(body: any) {
      // Don't wrap if already formatted
      if (body?.success !== undefined) {
        return originalJson.call(this, body);
      }
      
      // Format error responses
      if (body?.error) {
        return originalJson.call(this, {
          success: false,
          error: body.error
        });
      }
      
      // Format success responses
      return originalJson.call(this, {
        success: true,
        data: body
      });
    };
    next();
  });

  // API routes - everything under /api
  const apiRouter = createApiRouter();
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Global error handling
  app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    
    console.error('Server Error:', err);
    
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
  });

  return app;
}
