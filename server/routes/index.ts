import { Router, Request, Response } from 'express';
import { setupAuthRoutes } from './auth.routes';
import { setupTestimonialRoutes } from './testimonial.routes';
import { setupWidgetRoutes } from './widget.routes';
import { setupAnalyticsRoutes } from './analytics.routes';
import { setupStripeRoutes } from './stripe.routes';

export function createApiRouter(): Router {
  const router = Router();

  // API status endpoint
  router.get('/status', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      status: 'ok',
      version: '1.0',
      timestamp: new Date().toISOString()
    });
  });

  // Error handler for this router
  router.use((err: Error, _req: Request, res: Response) => {
    console.error('API Error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
      status: 'error'
    });
  });

  try {
    // Setup all route modules
    // Auth routes are mounted directly under /api
    setupAuthRoutes(router);
    
    // Feature-specific routes are mounted under their respective prefixes
    setupTestimonialRoutes(router); // /api/testimonials/*
    setupWidgetRoutes(router);      // /api/widgets/*
    setupAnalyticsRoutes(router);   // /api/analytics/*
    setupStripeRoutes(router);      // /api/billing/*

    console.log('All routes mounted successfully');
  } catch (error) {
    console.error('Error setting up routes:', error);
    throw error;
  }

  return router;
}
