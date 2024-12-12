import { Router } from 'express';
import { setupAuthRoutes } from './auth.routes';
import { setupTestimonialRoutes } from './testimonial.routes';
import { setupWidgetRoutes } from './widget.routes';
import { setupAnalyticsRoutes } from './analytics.routes';
import { setupStripeRoutes } from './stripe.routes';

export function createApiRouter(router: Router) {
  // API status endpoint
  router.get('/status', (_req, res) => {
    res.json({
      status: 'ok',
      version: '1.0',
      timestamp: new Date().toISOString()
    });
  });

  // Setup all route modules
  // Auth routes are mounted directly under /api
  setupAuthRoutes(router);
  
  // Feature-specific routes are mounted under their respective prefixes
  setupTestimonialRoutes(router); // /api/testimonials/*
  setupWidgetRoutes(router);      // /api/widgets/*
  setupAnalyticsRoutes(router);   // /api/analytics/*
  setupStripeRoutes(router);      // /api/billing/*

  // Return router for chaining
  return router;
}
