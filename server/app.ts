import express from 'express';
import cors from 'cors';
import path from 'path';
import { setupAuth } from './auth';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import { setupDb } from './db';
import session from 'express-session';
import MemoryStore from 'memorystore';

export async function createApp() {
  try {
    // Initialize database first
    console.log('[App] Initializing database connection');
    await setupDb();
    
    console.log('[App] Creating Express application');
    const app = express();
    
    // Core middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // CORS configuration with specific origins
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL 
        : 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    };
    app.use(cors(corsOptions));
    console.log('[App] CORS configured:', corsOptions.origin);

    // Session setup
    const MemoryStoreSession = MemoryStore(session);
    app.use(session({
      secret: process.env.SESSION_SECRET || 'development_secret_key',
      name: 'testimonial.sid',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000
      })
    }));

    // Initialize authentication
    console.log('[App] Setting up authentication');
    await setupAuth(app);

    // API routes with error handling
    console.log('[App] Setting up API routes');
    const apiRouter = express.Router();
    
    // Global error handler for API routes
    apiRouter.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[API Error]', err);
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    // Mount routes
    setupTestimonialRoutes(apiRouter);
    setupWidgetRoutes(apiRouter);
    
    // Mount API router
    app.use('/api', apiRouter);

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

    console.log('[App] Application setup complete');
    return app;
  } catch (error) {
    console.error('[App] Initialization error:', error);
    throw error;
  }
}
