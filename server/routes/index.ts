import { Router } from 'express';
import { setupAuthRoutes } from './auth.routes';
import { setupTestimonialRoutes } from './testimonial.routes';
import { setupWidgetRoutes } from './widget.routes';
import { setupAnalyticsRoutes } from './analytics.routes';
import { setupStripeRoutes } from './stripe.routes';

// Create and configure the API router
export function createApiRouter() {
  const router = Router();

  // API request logging and response setup
  router.use((req, res, next) => {
    try {
      console.log(`[API] ${req.method} ${req.path}`, {
        authenticated: req.isAuthenticated?.() || false,
        userId: req.user?.id || 'none',
        session: req.session?.id || 'none'
      });
      res.setHeader('Content-Type', 'application/json');
      next();
    } catch (error) {
      console.error('[API] Request processing error:', error);
      next(error);
    }
  });

  // API response formatter
  router.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(body: any) {
      try {
        // Handle null or undefined
        if (body === null || body === undefined) {
          return originalJson.call(this, { success: true, data: null });
        }

        // Don't wrap if already formatted
        if (body?.success !== undefined) {
          return originalJson.call(this, body);
        }
        
        // Format error responses
        if (body?.error) {
          return originalJson.call(this, {
            success: false,
            error: body.error,
          });
        }
        
        // Format success responses
        return originalJson.call(this, {
          success: true,
          data: body
        });
      } catch (err) {
        console.error('Error formatting response:', err);
        return originalJson.call(this, {
          success: false,
          error: 'Internal server error'
        });
      }
    };
    next();
  });

  // Create sub-routers
  const authRouter = Router();
  const testimonialRouter = Router();
  const widgetRouter = Router();
  const analyticsRouter = Router();
  const stripeRouter = Router();

  // Setup routes
  setupAuthRoutes(authRouter);
  setupTestimonialRoutes(testimonialRouter);
  setupWidgetRoutes(widgetRouter);
  setupAnalyticsRoutes(analyticsRouter);
  setupStripeRoutes(stripeRouter);

  // Mount routers
  router.use('/auth', authRouter);
  router.use('/testimonials', testimonialRouter);
  router.use('/widgets', widgetRouter);
  router.use('/analytics', analyticsRouter);
  router.use('/stripe', stripeRouter);

  // Global API error handler
  router.use((err: Error, _req: any, res: any, _next: any) => {
    console.error('[API Error]:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
  });

  // 404 handler
  router.use((_req, res) => {
    res.status(404).json({ 
      success: false,
      error: 'API endpoint not found' 
    });
  });

  return router;
}
