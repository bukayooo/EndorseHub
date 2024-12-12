import express from 'express';
import cors from 'cors';
import path from 'path';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';
import session from 'express-session';
import createMemoryStore from 'memorystore';

export async function createApp() {
  try {
    const app = express();
    
    // Core middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // CORS configuration for local development
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL 
        : ['http://localhost:5173', 'http://172.31.196.3:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Set-Cookie'],
      preflightContinue: true
    };
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    // Enhanced session configuration with memory store
    const MemoryStore = createMemoryStore(session);
    app.use(session({
      secret: process.env.SESSION_SECRET || 'development-secret',
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax' as const,
        maxAge: 24 * 60 * 60 * 1000
      }
    }));
    if (app.get('env') === 'production') {
      app.set('trust proxy', 1);
    }

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

    // API routes with session check middleware
    const apiRouter = createApiRouter();
    app.use('/api', (req, res, next) => {
      console.log('[Session Debug]', {
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated?.(),
        user: req.user,
        path: req.path
      });
      next();
    }, apiRouter);

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Static file serving for SPA
    const clientDistPath = path.join(process.cwd(), '..', 'client', 'dist');
    app.use(express.static(clientDistPath));

    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: clientDistPath });
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