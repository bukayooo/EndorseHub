import { Router } from "express";
import { requireAuth } from "../types/routes";
import { testimonialRepository } from '../repositories/testimonial.repository';
import { widgetRepository } from '../repositories/widget.repository';
import { analytics, widgets } from "../../db/schema";
import { sql, eq } from 'drizzle-orm';
import { db } from '../../db';
export function setupAnalyticsRoutes(app) {
    const router = Router();
    // Get stats for a user
    const getStats = async (req, res) => {
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
                    totalViews: sql `COALESCE(SUM(${analytics.views}), 0)`,
                    totalClicks: sql `COALESCE(SUM(${analytics.clicks}), 0)`
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
        }
        catch (error) {
            console.error('Error in getStats:', error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return res.status(500).json({
                success: false,
                error: process.env.NODE_ENV === 'development' ? errorMessage : "An unexpected error occurred",
                timestamp: new Date().toISOString()
            });
        }
    };
    // Get stats for a specific widget
    const getWidgetStats = async (req, res) => {
        try {
            if (!req.isAuthenticated() || !req.user?.id) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required"
                });
            }
            const widgetId = parseInt(req.params.widgetId);
            if (isNaN(widgetId)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid widget ID"
                });
            }
            // Check if the widget belongs to the user
            const widget = await db.select()
                .from(widgets)
                .where(sql `${widgets.id} = ${widgetId} AND ${widgets.user_id} = ${req.user.id}`)
                .limit(1);
            if (!widget.length) {
                return res.status(404).json({
                    success: false,
                    error: "Widget not found"
                });
            }
            const stats = await db.select({
                views: sql `COALESCE(SUM(${analytics.views}), 0)`,
                clicks: sql `COALESCE(SUM(${analytics.clicks}), 0)`
            })
                .from(analytics)
                .where(eq(analytics.widget_id, widgetId));
            const { views, clicks } = stats[0] || { views: 0, clicks: 0 };
            const conversionRate = views > 0
                ? ((clicks / views) * 100).toFixed(1) + '%'
                : '0%';
            console.log(`[Analytics] Stats for widget ${widgetId}: ${views} views, ${clicks} clicks`);
            return res.json({
                success: true,
                data: {
                    views,
                    clicks,
                    conversionRate,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('Error in getWidgetStats:', error);
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
    router.get('/:widgetId', requireAuth, getWidgetStats);
    // Mount router at /analytics/stats
    app.use('/analytics/stats', router);
    console.log('[Analytics] Routes mounted at /analytics/stats');
    return router;
}
