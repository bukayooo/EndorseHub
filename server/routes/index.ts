import { Router } from 'express';
import { setupAuthRoutes } from './auth.routes';
import { setupTestimonialRoutes } from './testimonial.routes';
import { setupWidgetRoutes } from './widget.routes';
import { setupAnalyticsRoutes } from './analytics.routes';
import { setupStripeRoutes } from './stripe.routes';

export function createApiRouter() {
  const router = Router();
  
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount auth routes directly under /api for /api/login endpoint
  setupAuthRoutes(router);
  
  // Mount other routes with their respective prefixes
  setupTestimonialRoutes(router);
  setupWidgetRoutes(router);
  setupAnalyticsRoutes(router);
  setupStripeRoutes(router);

  return router;
}
