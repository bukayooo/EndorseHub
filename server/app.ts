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
    
    // CORS configuration
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL 
        : ['http://localhost:5173', 'http://172.31.196.3:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie']
    };
    app.use(cors(corsOptions));

    // Enhanced session configuration
    const MemoryStore = createMemoryStore(session);
    const sessionConfig: session.SessionOptions = {
      name: 'testimonial.sid',
      secret: process.env.SESSION_SECRET || 'development-secret',
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000 // 24h
      }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24h
        path: '/'
      }
    };

    // In production, trust proxy and enable secure cookies
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
      sessionConfig.cookie!.secure = true;
    }

    if (app.get('env') === 'production') {
      app.set('trust proxy', 1);
      if (sessionConfig.cookie) sessionConfig.cookie.secure = true;
    }

    app.use(session(sessionConfig));

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
      const sessionInfo = {
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated?.(),
        hasUser: !!req.user,
        userId: req.user?.id,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      };
      
      console.log('[API Request]', sessionInfo);
      
      // Track session state
      if (req.session) {
        console.log('[Session State]', {
          id: req.sessionID,
          cookie: req.session.cookie,
          authenticated: req.isAuthenticated?.(),
          user: req.user?.id
        });
      }
      
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