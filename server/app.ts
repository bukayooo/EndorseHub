import express from 'express';
import cors from 'cors';
import path from 'path';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';

export async function createApp() {
  try {
    const app = express();
    
    // Core middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // CORS configuration for local development
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://0.0.0.0:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposedHeaders: ['Set-Cookie'],
    }));

    // Error handling for middleware initialization
    app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (res.headersSent) return next(err);
      console.error('Middleware initialization error:', err);
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
      });
    });

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

    // Serve static files from the frontend build directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Serve index.html for all other routes (client-side routing)
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: distPath });
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
  } catch (error) {
    console.error('App initialization error:', error);
    throw error;
  }
}
