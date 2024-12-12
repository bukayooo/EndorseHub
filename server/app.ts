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
    
    // CORS configuration for development and production
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // In development, allow all origins to handle HMR and API requests
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        // In production, check against allowed origins
        const allowedOrigins = [process.env.FRONTEND_URL || ''].filter(Boolean);
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`Origin ${origin} not allowed by CORS`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposedHeaders: ['Set-Cookie'],
      maxAge: 86400 // Cache preflight request for 24 hours
    };
    
    app.use(cors(corsOptions));

    // API middleware
    app.use('/api', (req, res, next) => {
      res.type('json');
      next();
    });

    // Request logging with error handling
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
        );
      });
      next();
    });

    // Setup auth middleware (session)
    setupAuth(app);

    // Mount API routes with prefix and ensure consistent JSON responses
    app.use('/api', (req, res, next) => {
      // Set JSON content type for all API responses
      res.type('application/json');
      
      // Override res.json to ensure consistent response format
      const originalJson = res.json;
      res.json = function(body) {
        const formattedBody = {
          status: res.statusCode >= 400 ? 'error' : 'success',
          data: body,
          timestamp: new Date().toISOString()
        };
        return originalJson.call(this, formattedBody);
      };
      
      next();
    }, createApiRouter());

    // Simple status endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    // Global error handling
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Error:', err);
      // Ensure Content-Type is set to application/json
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        status: 'error'
      });
    });

    // Handle 404 errors with JSON response
    app.use((_req: express.Request, res: express.Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({ error: 'Not Found', status: 'error' });
    });

    return app;
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
}