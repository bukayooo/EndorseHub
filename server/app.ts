import express from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { setupAuth } from './auth';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import { setupStatsRoutes } from './routes/stats.routes';
import { checkConnection } from './db';

export async function createApp() {
  try {
    console.log('[App] Starting application setup...');
    
    const app = express();
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    console.log('[App] Setting up CORS...');
    app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = ['http://localhost:5173', 'http://0.0.0.0:5173'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-CSRF-Token'],
      exposedHeaders: ['Set-Cookie']
    }));

    console.log('[App] Setting up session store...');
    const MemoryStoreSession = MemoryStore(session);
    app.use(session({
      secret: 'development_secret_key',
      name: 'testimonial.sid',
      resave: false,
      rolling: true,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
        ttl: 24 * 60 * 60 * 1000,
        noDisposeOnSet: true
      }),
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        path: '/'
      }
    }));

    // Add error handling middleware early
    app.use((err: any, _req: any, _res: any, next: any) => {
      console.error('[App] Error:', err);
      next(err);
    });

    console.log('[App] Setting up authentication...');
    await setupAuth(app);

    if (process.env.NODE_ENV === 'development') {
      app.use((req, res, next) => {
        console.log('[Request]', req.method, req.path, {
          authenticated: req.isAuthenticated(),
          userId: req.user?.id,
          sessionID: req.sessionID
        });
        next();
      });
    }

    console.log('[App] Setting up API routes...');
    const apiRouter = express.Router();
    
    setupTestimonialRoutes(apiRouter);
    setupWidgetRoutes(apiRouter);
    setupStatsRoutes(apiRouter);

    app.use('/api', apiRouter);

    // Global error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[Error]', err);
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    console.log('[App] Application setup completed');
    return app;
  } catch (error) {
    console.error('[App] Fatal error during app creation:', error);
    throw error;
  }
}
