import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { testimonials, widgets } from "@db/schema";
import { type RouteHandler, requireAuth } from "../types/routes";

const router = Router();

export function setupAnalyticsRoutes(app: Router) {
  // Middleware to ensure JSON responses
  router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Get stats
  const getStats: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const [[{ count: testimonialCount }], [{ count: widgetCount }]] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*)::int as count
          FROM ${testimonials}
          WHERE ${testimonials.userId} = ${req.user.id}
        `).then(result => result.rows),
        db.execute(sql`
          SELECT COUNT(*)::int as count
          FROM ${widgets}
          WHERE ${widgets.userId} = ${req.user.id}
        `).then(result => result.rows)
      ]);

      return res.json({
        testimonialCount,
        widgetCount,
        viewCount: 0,
        conversionRate: "0%"
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

  // Error handling middleware
  router.use((err: any, _req: any, res: any, _next: any) => {
    console.error('Analytics error:', err);
    return res.status(500).json({
      error: "Failed to fetch analytics data",
      details: err instanceof Error ? err.message : "Unknown error"
    });
  });

  // Mount routes
  app.use("/analytics", router);
  return router;
}
