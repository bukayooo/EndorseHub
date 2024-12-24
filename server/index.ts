import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupAuthRoutes } from './routes/auth.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';
import { setupStripeRoutes } from './routes/stripe.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';
import fs from 'fs/promises';

const MemoryStoreSession = MemoryStore(session);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    console.log('[Server] Starting server initialization...');
    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Stripe webhook needs raw body
    app.post('/api/billing/webhook', express.raw({ type: 'application/json' }));

    // Trust proxy in production
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }

    // Session configuration
    const sessionConfig: session.SessionOptions = {
      secret: process.env.SESSION_SECRET || 'development-secret-key',
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      name: 'testimonial.sid',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    };

    app.use(session(sessionConfig));
    app.use(passport.initialize());
    app.use(passport.session());

    // CORS configuration
    const allowedOrigins = [
      'http://localhost:5173',
      'http://0.0.0.0:5173',
      /\.replit\.dev$/,
      /\.replit\.app$/,
      process.env.CLIENT_URL
    ].filter(Boolean);

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed instanceof RegExp) return allowed.test(origin);
          return allowed === origin;
        });

        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn('[CORS] Blocked request from origin:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
      exposedHeaders: ['Set-Cookie']
    }));

    // API routes setup
    console.log('[Server] Setting up API routes...');
    const router = express.Router();

    // Setup routes
    await setupAuthRoutes(router);
    setupTestimonialRoutes(router);
    setupAnalyticsRoutes(router);
    setupStripeRoutes(router);
    setupWidgetRoutes(router);

    // Mount API routes at /api
    app.use('/api', router);
    console.log('[Server] API routes mounted at /api');

    // Static file serving
    const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');
    console.log('[Server] Client dist path:', clientDistPath);

    try {
      const distStats = await fs.stat(clientDistPath);
      if (distStats.isDirectory()) {
        app.use(express.static(clientDistPath));
        console.log('[Server] Serving static files from:', clientDistPath);
      }
    } catch (error) {
      console.warn('[Server] Client dist directory not found - development mode assumed');
    }

    // SPA fallback
    app.get('*', async (_req: Request, res: Response) => {
      const indexPath = path.join(clientDistPath, 'index.html');
      try {
        await fs.access(indexPath);
        res.sendFile(indexPath);
      } catch {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Client app is not built yet. Please run the build command first.'
        });
      }
    });

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[Server] Error:', err);
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
      });
    });

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] API Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});