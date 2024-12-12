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
          status: 'error',
          error: "Authentication required" 
        });
      }

      const userId = req.user.id;

      try {
        const [testimonialCount, widgetCount] = await Promise.all([
          testimonialRepository.countByUserId(userId),
          widgetRepository.countByUserId(userId)
        ]);

        return res.json({
          status: 'success',
          data: {
            testimonialCount,
            widgetCount,
            viewCount: 0,
            conversionRate: "0%"
          }
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          status: 'error',
          error: "Database error",
          message: "Failed to fetch statistics"
        });
      }
    } catch (error) {
      console.error('Error in getStats:', error);
      return res.status(500).json({ 
        status: 'error',
        error: "Server error",
        message: process.env.NODE_ENV === 'development' 
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
