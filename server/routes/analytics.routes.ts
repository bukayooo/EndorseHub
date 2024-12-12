import { Router } from "express";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonialRepository } from '../repositories/testimonial.repository';
import { widgetRepository } from '../repositories/widget.repository';

const router = Router();

export function setupAnalyticsRoutes(app: Router) {
  // Get stats for a user
  const getStats: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const [testimonialCount, widgetCount] = await Promise.all([
        testimonialRepository.countByUserId(req.user.id),
        widgetRepository.countByUserId(req.user.id)
      ]);

      // Log the counts for debugging
      console.log('Stats for user', req.user.id, ':', {
        testimonialCount,
        widgetCount
      });

      return res.json({
        testimonialCount,
        widgetCount,
        viewCount: 0, // TODO: Implement view tracking
        conversionRate: "0%" // TODO: Implement conversion tracking
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      return res.status(500).json({ 
        error: "Failed to fetch stats",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Register routes
  router.get("/stats", requireAuth, getStats);

  // Mount routes
  app.use("/analytics", router);
  return router;
}
