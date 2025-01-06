import { Router } from "express";
import { db } from "../../db";
import { requireAuth } from "../types/routes";
import { widgets, testimonials, analytics } from "@db/schema";
import { eq, count, sql } from "drizzle-orm";
const router = Router();
export function setupStatsRoutes(app) {
    // Debug middleware
    router.use((req, res, next) => {
        console.log('[Stats Route] Request received:', {
            method: req.method,
            path: req.path,
            body: req.body,
            user: req.user?.id,
            session: req.session?.id
        });
        next();
    });
    // Get user stats
    const getStats = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required"
                });
            }
            // Get testimonial count
            const [testimonialStats] = await db
                .select({
                count: count(testimonials.id)
            })
                .from(testimonials)
                .where(eq(testimonials.user_id, userId));
            // Get widget count
            const [widgetStats] = await db
                .select({
                count: count(widgets.id)
            })
                .from(widgets)
                .where(eq(widgets.user_id, userId));
            // Get total views and clicks
            const [analyticsStats] = await db
                .select({
                views: sql `COALESCE(SUM(${analytics.views}), 0)`,
                clicks: sql `COALESCE(SUM(${analytics.clicks}), 0)`
            })
                .from(analytics)
                .innerJoin(widgets, eq(widgets.id, analytics.widget_id))
                .where(eq(widgets.user_id, userId));
            const stats = {
                testimonialCount: testimonialStats?.count || 0,
                widgetCount: widgetStats?.count || 0,
                viewCount: analyticsStats?.views || 0,
                clickCount: analyticsStats?.clicks || 0,
                conversionRate: analyticsStats?.views
                    ? `${((analyticsStats.clicks / analyticsStats.views) * 100).toFixed(1)}%`
                    : '0%'
            };
            return res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
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
