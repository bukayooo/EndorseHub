import express from 'express';
import cors from 'cors';
import { Router } from 'express';
import { setupAuth } from './auth';
import { setupTestimonialRoutes } from './routes/testimonial.routes';
import { setupWidgetRoutes } from './routes/widget.routes';
import { setupAnalyticsRoutes } from './routes/analytics.routes';
import { setupStripeRoutes } from './routes/stripe.routes';
import { setupAuthRoutes } from './routes/auth.routes';

export async function createApp() {
  const app = express();
  
  // Essential middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://testimonialhub.repl.co'
      : 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['set-cookie']
  }));

  // Setup auth middleware first (session middleware)
  setupAuth(app);

  // Create and configure API router with JSON middleware
  const apiRouter = Router();
  
  // Ensure all API routes return JSON
  apiRouter.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });
  
  // API status endpoint
  apiRouter.get('/status', (_req, res) => {
    res.json({ status: 'ok', version: '1.0' });
  });

  // Setup auth routes first (they need to be mounted before protected routes)
  setupAuthRoutes(apiRouter);      // /api/login, /api/register, etc.

  // Setup feature routes
  setupTestimonialRoutes(apiRouter); // /api/testimonials/*
  setupWidgetRoutes(apiRouter);      // /api/widgets/*
  setupAnalyticsRoutes(apiRouter);   // /api/analytics/*
  setupStripeRoutes(apiRouter);      // /api/billing/*

  // Mount all API routes under /api prefix
  app.use('/api', apiRouter);

  // Basic health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Global error handling
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    const response = {
      error: err.message || 'Internal server error',
      status: err.status || 500,
      timestamp: new Date().toISOString()
    };
    
    // Ensure JSON response for API routes
    if (_req.path.startsWith('/api')) {
      res.setHeader('Content-Type', 'application/json');
    }
    
    res.status(response.status).json(response);
  });

  // 404 handler
  app.use((_req: express.Request, res: express.Response) => {
    const response = { 
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
      path: _req.path
    };
    
    // Ensure JSON response for API routes
    if (_req.path.startsWith('/api')) {
      res.setHeader('Content-Type', 'application/json');
    }
    
    res.status(404).json(response);
  });

  return app;
}