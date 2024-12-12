import { Router } from 'express';
import { setupAuthRoutes } from './auth.routes';
import { setupTestimonialRoutes } from './testimonial.routes';
import { setupWidgetRoutes } from './widget.routes';
import { setupAnalyticsRoutes } from './analytics.routes';
import { setupStripeRoutes } from './stripe.routes';

export function createApiRouter(): Router {
  const router = Router();

  // API request logging and response setup
  router.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Simple API response formatter
  router.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(body: any) {
      // If error response
      if (body?.error) {
        return originalJson.call(this, {
          success: false,
          error: body.error
        });
      }
      // Pass through the response
      return originalJson.call(this, body);
    };
    next();
  });

  // Mount route modules
  setupAuthRoutes(router);
  setupTestimonialRoutes(router);
  setupWidgetRoutes(router);
  setupAnalyticsRoutes(router);
  setupStripeRoutes(router);

  // Global API error handler
  router.use((err: Error, _req: any, res: any, _next: any) => {
    console.error('[API Error]:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
  });

  // 404 handler
  router.use((_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  return router;
}
