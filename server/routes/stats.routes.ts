import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonials, widgets, analytics } from "@db/schema";
import { sql, eq } from "drizzle-orm";

const router = Router();

export function setupStatsRoutes(app: Router) {
  const getStats: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: "Authentication required" 
        });
      }

      const userId = req.user.id;

      // Get testimonial count
      const [testimonialStats] = await db
        .select({
          count: sql<number>`CAST(COUNT(${testimonials.id}) AS INTEGER)`
        })
        .from(testimonials)
        .where(eq(testimonials.userId, userId));

      console.log('[Stats] Testimonial count for user', userId, ':', testimonialStats.count);

      // Get widget count
      const [widgetStats] = await db
        .select({
          count: sql<number>`cast(count(*) as integer)`
        })
        .from(widgets)
        .where(sql`${widgets.userId} = ${userId}`);

      // Get analytics totals
      const [analyticsStats] = await db
        .select({
          viewCount: sql<number>`COALESCE(SUM(${analytics.views}), 0)`,
          clickCount: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`
        })
        .from(analytics)
        .innerJoin(widgets, sql`${widgets.id} = ${analytics.widgetId}`)
        .where(sql`${widgets.userId} = ${userId}`);

      // Calculate conversion rate
      const conversionRate = analyticsStats.viewCount > 0
        ? ((analyticsStats.clickCount / analyticsStats.viewCount) * 100).toFixed(1) + '%'
        : '0%';

      return res.json({
        success: true,
        data: {
          testimonialCount: testimonialStats.count || 0,
          widgetCount: widgetStats.count || 0,
          viewCount: Number(analyticsStats.viewCount) || 0,
          clickCount: Number(analyticsStats.clickCount) || 0,
          conversionRate
        }
      });
    } catch (error) {
      console.error('[Stats] Error fetching stats:', error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch stats" 
      });
    }
  };

  // Register routes
  router.get("/", requireAuth, getStats);

  // Mount routes
  app.use("/stats", router);
  console.log('[Stats] Routes mounted at /stats');

  return router;
}
