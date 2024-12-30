import { Router } from "express";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonialRepository } from '../repositories/testimonial.repository';
import { widgetRepository } from '../repositories/widget.repository';
import { analytics, widgets } from "../../db/schema";
import { sql, eq } from 'drizzle-orm';
import { db } from '../../db';

export function setupAnalyticsRoutes(app: Router) {
  const router = Router();

  // Get stats for a user
  const getStats: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = req.user.id;

      const [testimonialCount, widgetCount, viewStats] = await Promise.all([
        testimonialRepository.countByUserId(userId),
        widgetRepository.countByUserId(userId),
        db.select({
          totalViews: sql<number>`COALESCE(SUM(${analytics.views}), 0)`,
          totalClicks: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`
        })
          .from(analytics)
          .innerJoin(widgets, eq(analytics.widget_id, widgets.id))
          .where(eq(widgets.user_id, userId))
      ]);

      const stats = viewStats[0] || { totalViews: 0, totalClicks: 0 };
      const conversionRate = stats.totalViews > 0 
        ? ((stats.totalClicks / stats.totalViews) * 100).toFixed(1) + '%'
        : '0%';

      console.log(`[Analytics] Stats for user ${userId}: ${testimonialCount} testimonials, ${widgetCount} widgets`);
      return res.json({
        success: true,
        data: {
          testimonialCount,
          widgetCount,
          viewCount: stats.totalViews || 0,
          clickCount: stats.totalClicks || 0,
          conversionRate,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in getStats:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? errorMessage : "An unexpected error occurred",
        timestamp: new Date().toISOString()
      });
    }
  };

  // Register routes
  router.get('/', requireAuth, getStats);
  
  // Mount router at /stats
  app.use('/stats', router);
  console.log('[Analytics] Routes mounted at /stats');
  
  return router;
}
