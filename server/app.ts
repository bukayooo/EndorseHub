import express, { Router } from 'express';
import cors from 'cors';
import path from 'path';
import { setupAuth } from './auth';
import { createApiRouter } from './routes';

export async function createApp() {
  try {
    console.log('[App] Creating Express application');
    const app = express();
    
    // Core middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // CORS configuration
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL 
        : ['http://localhost:5173', 'http://0.0.0.0:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie']
    };
    app.use(cors(corsOptions));
    console.log('[App] CORS configured:', corsOptions.origin);

    // Initialize authentication with session handling
    console.log('[App] Setting up authentication');
    const auth = await setupAuth(app);
    
    // API routes setup
    console.log('[App] Creating API router');
    const apiRouter = createApiRouter();
    
    // Authentication routes
    const authRouter = Router();
    authRouter.post('/register', auth.registerRoute);
    authRouter.post('/login', auth.loginRoute);
    authRouter.post('/logout', auth.logoutRoute);
    authRouter.get('/user', auth.userRoute);
    app.use('/api/auth', authRouter);
    
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