import express from 'express';
import { type Express } from 'express';
import cors from 'cors';
import { setupAuth } from './auth';
import { setupRoutes } from './routes/index';

const isDev = process.env.NODE_ENV !== 'production';
const CORS_ORIGINS = isDev 
  ? ['http://localhost:5173', 'http://0.0.0.0:5173']
  : ['https://testimonialhub.repl.co'];

export async function createApp(): Promise<Express> {
  const app = express();
  
  // Basic middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
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

  // Setup authentication before routes
  setupAuth(app);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', environment: process.env.NODE_ENV });
  });

  // Setup API routes
  const router = setupRoutes();
  app.use('/api', router);

  return app;
}