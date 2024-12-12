import { Router } from "express";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonialRepository } from '../repositories/testimonial.repository';
import { widgetRepository } from '../repositories/widget.repository';

export function setupAnalyticsRoutes(app: Router) {
  const router = Router();

  // Get stats for a user
  const getStats: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({
          error: "Authentication required"
        });
      }

      const userId = req.user.id;

      const [testimonialCount, widgetCount] = await Promise.all([
        testimonialRepository.countByUserId(userId),
        widgetRepository.countByUserId(userId)
      ]);

      console.log(`[Analytics] Stats for user ${userId}: ${testimonialCount} testimonials, ${widgetCount} widgets`);
      return res.json({
        success: true,
        data: {
          testimonialCount,
          widgetCount,
          viewCount: 0,
          conversionRate: "0%"
        }
      });
    } catch (error) {
      console.error('Error in getStats:', error);
      return res.status(500).json({
        error: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : "Unknown error"
          : "An unexpected error occurred"
      });
    }
  };

  // Register routes
  router.get('/', requireAuth, getStats);
  
  // Mount router at /api/stats
  app.use('/stats', router);
  
  return router;
}
