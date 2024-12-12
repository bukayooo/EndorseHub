import { Router } from 'express';
import { setupAuthRoutes } from './auth.routes';
import { setupTestimonialRoutes } from './testimonial.routes';
import { setupWidgetRoutes } from './widget.routes';
import { setupAnalyticsRoutes } from './analytics.routes';
import { setupStripeRoutes } from './stripe.routes';

export function createApiRouter(): Router {
  const router = Router();

  // Ensure JSON responses for all API routes
  router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Mount all routes
  setupAuthRoutes(router);
  setupTestimonialRoutes(router);
  setupWidgetRoutes(router);
  setupAnalyticsRoutes(router);
  setupStripeRoutes(router);

  // Handle 404 for API routes
  router.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return router;
}
