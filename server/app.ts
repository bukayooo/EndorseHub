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
  
  // Configure CORS to allow frontend requests
  app.use(cors({
    origin: ['http://localhost:5173', 'http://0.0.0.0:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
  }));

  // Add detailed request logging
  app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    
    // Log response status and time on completion
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  });

  // Setup auth middleware first (session middleware)
  setupAuth(app);

  // Create and configure API router with JSON middleware
  const apiRouter = Router();
  
  // Global API middleware for consistent JSON responses
  apiRouter.use((req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Create wrapper for consistent JSON responses
    const wrapResponse = (data: any) => {
      const isError = data?.error || res.statusCode >= 400;
      const timestamp = new Date().toISOString();
      
      if (isError) {
        return {
          success: false,
          error: data?.error || 'Request failed',
          message: data?.message || data?.error || 'An error occurred',
          timestamp
        };
      }
      
      return {
        success: true,
        data,
        timestamp
      };
    };
    
    // Override json method only
    res.json = function(data) {
      // Set JSON content type
      res.setHeader('Content-Type', 'application/json');
      return originalJson(wrapResponse(data));
    };
    
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

  // Serve static files for development
  if (process.env.NODE_ENV === 'development') {
    app.use(express.static('public'));
    
    // Add a catch-all route for the API to handle 404s better
    app.all('/api/*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
      });
    });
  }

  // Basic health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Simple error response helper
  const errorResponse = (err: any, isDev = false) => ({
    error: isDev ? err.message : 'Internal server error',
    code: err.code,
    status: err.status || 500
  });

  // API error handling middleware
  apiRouter.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    const status = err.status || 500;
    res.status(status).json(errorResponse(err, process.env.NODE_ENV === 'development'));
  });

  // Global error handling
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    const status = err.status || 500;
    
    if (req.path.startsWith('/api')) {
      res.status(status).json(errorResponse(err, process.env.NODE_ENV === 'development'));
    } else {
      res.status(500).send('Internal Server Error');
    }
  });

  // 404 handler
  app.use((req: express.Request, res: express.Response) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      });
    } else {
      res.status(404).send('Not Found');
    }
  });

  return app;
}