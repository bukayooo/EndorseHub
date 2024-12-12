import { Router } from 'express';
import { setupAuthRoutes } from './auth.routes';
import { setupTestimonialRoutes } from './testimonial.routes';
import { setupWidgetRoutes } from './widget.routes';
import { setupAnalyticsRoutes } from './analytics.routes';
import { setupStripeRoutes } from './stripe.routes';

// Initialize main router
const router = Router();

// Centralized route setup
export function setupRoutes(app: Router) {
  // Mount all route modules
  setupAuthRoutes(router);
  setupTestimonialRoutes(router);
  setupWidgetRoutes(router);
  setupAnalyticsRoutes(router);
  setupStripeRoutes(router);
  
  // Mount all routes under /api
  app.use('/api', router);

  // 404 handler for unmatched routes
  app.use('*', (_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return router;
}

// Export for use in app.ts
export default router;
