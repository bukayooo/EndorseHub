import { Router } from "express";
import { db } from "../../db";
import { analytics } from "../../db/schema";
import { sql } from "drizzle-orm";
import { requireAuth } from "../types/routes";
import { testimonialRepository } from "../repositories/testimonial.repository";
import { widgetRepository } from "../repositories/widget.repository";

export function setupAnalyticsRoutes(app: Router) {
  const router = Router();

  // Get stats
  router.get('/stats', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get counts
      const [testimonialCount, widgetCount] = await Promise.all([
        testimonialRepository.countByUserId(userId),
        widgetRepository.countByUserId(userId)
      ]);

      // Get total views and clicks
      const analyticsResult = await db.select({
        totalViews: sql<number>`COALESCE(SUM(${analytics.views}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`
      })
      .from(analytics)
      .where(sql`${analytics.widget_id} IN (
        SELECT ${analytics.widget_id} FROM ${analytics}
        WHERE ${analytics.widget_id} IN (
          SELECT id FROM widgets WHERE user_id = ${userId}
        )
      )`);

      const { totalViews, totalClicks } = analyticsResult[0];

      res.json({
        success: true,
        data: {
          testimonialCount,
          widgetCount,
          totalViews: Number(totalViews),
          totalClicks: Number(totalClicks)
        }
      });
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  });

  app.use('/stats', router);
  return router;
}
