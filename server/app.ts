import express from 'express';
import cors from 'cors';
import path from 'path';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';
import session from 'express-session';
import MemoryStore from 'memorystore';

const MemoryStoreSession = MemoryStore(session);

export async function createApp() {
  try {
    console.log('[App] Creating Express application');
    const app = express();

    // Core middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

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

    // Session middleware
    app.use(session(sessionConfig));

    // CORS configuration
    const allowedOrigins = [
      'http://localhost:5173',
      'http://0.0.0.0:5173',
      /\.replit\.dev$/,
      /\.replit\.app$/
    ];

    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed instanceof RegExp) {
            return allowed.test(origin);
          }
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

    // Initialize authentication
    console.log('[App] Setting up authentication');
    await setupAuth(app);

    // API routes setup
    console.log('[App] Creating API router');
    const apiRouter = createApiRouter();
    app.use('/api', apiRouter);

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        env: process.env.NODE_ENV,
        version: '1.0.0',
        timestamp: new Date().toISOString() 
      });
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