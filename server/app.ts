import express from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import passport from 'passport';
import MemoryStore from 'memorystore';
import { createApiRouter } from './routes';
import fs from 'fs';

export async function createApp() {
  try {
    console.log('[App] Creating Express application');
    const app = express();
    
    // Core middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // CORS configuration
    app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
      exposedHeaders: ['Set-Cookie']
    }));

    // Session setup
    const MemoryStoreSession = MemoryStore(session);
    app.use(session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));

    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());
    
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
    const clientDistPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'client', 'dist')
      : path.join(process.cwd(), '..', 'client', 'dist');

    console.log('[App] Serving static files from:', clientDistPath);
    app.use(express.static(clientDistPath));

    // SPA fallback
    app.get('*', (_req, res) => {
      if (!fs.existsSync(path.join(clientDistPath, 'index.html'))) {
        console.error('[App] index.html not found in:', clientDistPath);
        return res.status(500).send('Server configuration error: index.html not found');
      }
      res.sendFile('index.html', { root: clientDistPath });
    });

    console.log('[App] Application setup complete');
    return app;
  } catch (error) {
    console.error('[App] Initialization error:', error);
    throw error;
  }
}