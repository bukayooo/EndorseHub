import { Router } from "express";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonialRepository } from '../repositories/testimonial.repository';
import { widgetRepository } from '../repositories/widget.repository';

const router = Router();

export function setupAnalyticsRoutes(app: Router) {
  // Get stats for a user
  const getStats: RouteHandler = async (req, res) => {
    try {
      console.log('Getting stats for request:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        session: req.session
      });

      if (!req.user?.id) {
        console.log('User not authenticated');
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log('Fetching counts for user:', req.user.id);
      
      const [testimonialCount, widgetCount] = await Promise.all([
        testimonialRepository.countByUserId(req.user.id),
        widgetRepository.countByUserId(req.user.id)
      ]).catch(error => {
        console.error('Error fetching counts:', error);
        throw error;
      });

      console.log('Retrieved counts:', {
        userId: req.user.id,
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
