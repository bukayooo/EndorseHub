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
    
    // CORS configuration
    app.use(cors({
      origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:5173', 'http://0.0.0.0:5173']
        : process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

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