import express from 'express';
import { type Express } from 'express';
import cors from 'cors';
import session from 'express-session';
import { createServer } from 'http';
import { setupAuth } from './auth';
import { setupRoutes } from './routes';
import createMemoryStore from 'memorystore';

const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3000 : Number(process.env.PORT);
const CORS_ORIGINS = isDev 
  ? ['http://localhost:5173', 'http://0.0.0.0:5173']
  : ['https://testimonialhub.repl.co'];

// Session store setup
const MemoryStore = createMemoryStore(session);
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function createApp(): Promise<Express> {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'development-secret',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: THIRTY_DAYS
    }),
    cookie: {
      secure: !isDev,
      sameSite: isDev ? 'lax' : 'none',
      maxAge: THIRTY_DAYS
    }
  }));

  // Setup authentication before routes
  setupAuth(app);

  // Setup all routes
  setupRoutes(app);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', environment: process.env.NODE_ENV });
  });

  return app;
}

export async function startServer(app: Express): Promise<void> {
  const server = createServer(app);

  return new Promise((resolve, reject) => {
    try {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`Server listening on port ${PORT}`);
        resolve();
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM received. Shutting down gracefully...');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      reject(error);
    }
  });
}
