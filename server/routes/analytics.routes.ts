import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { testimonials, widgets } from "@db/schema";
import { eq } from "drizzle-orm";
import { type AuthenticatedRequest, type RouteHandler } from "../types/routes";

const router = Router();

export function setupAnalyticsRoutes(app: Router) {
  // Get stats
  const getStats: RouteHandler = async (req, res) => {
    try {
      try {
        assertAuthenticated(req);
      } catch {
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

      res.json({
        testimonialCount,
        widgetCount,
        viewCount: 0, // TODO: Implement real analytics
        conversionRate: "0%",
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  };

  // Register routes
  router.get("/stats", getStats);

  // Mount routes
  app.use("/analytics", router);
  return router;
}
