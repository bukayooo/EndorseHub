import express from 'express';
import { type Express } from 'express';
import cors from 'cors';
import { setupAuth } from './auth';
import setupRoutes from './routes/index';

const isDev = process.env.NODE_ENV !== 'production';
const CORS_ORIGINS = isDev 
  ? ['http://localhost:5173', 'http://0.0.0.0:5173']
  : ['https://testimonialhub.repl.co'];

export async function createApp(): Promise<Express> {
  const app = express();
  
  // Security and parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  
  // CORS configuration for frontend
  app.use(cors({
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400 // 24 hours
  }));

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Setup authentication
  setupAuth(app);

  // API health check
  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'healthy',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // Mount all API routes
  app.use('/api', setupRoutes());

  // 404 handler for unknown endpoints
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'Endpoint does not exist' });
  });

  return app;
}