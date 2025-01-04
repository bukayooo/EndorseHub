import { db, eq, sql } from "../../db";
import { analytics } from "../../db/schema";
export const analyticsRepository = {
    async findByWidgetId(widgetId) {
        const result = await db
            .select()
            .from(analytics)
            .where(eq(analytics.widget_id, widgetId))
            .limit(1);
        return result[0];
    },
    async getStats(widgetId) {
        const result = await db
            .select({
            views: sql `COALESCE(SUM(${analytics.views}), 0)`,
            clicks: sql `COALESCE(SUM(${analytics.clicks}), 0)`
        })
            .from(analytics)
            .where(eq(analytics.widget_id, widgetId));
        return result[0];
    },
    async incrementViews(widgetId) {
        const existing = await this.findByWidgetId(widgetId);
        if (existing) {
            await db
                .update(analytics)
                .set({ views: sql `${analytics.views} + 1` })
                .where(eq(analytics.widget_id, widgetId));
        }
        else {
            await db
                .insert(analytics)
                .values({
                widget_id: widgetId,
                views: 1,
                clicks: 0,
                created_at: new Date()
            });
        }
    },
    async incrementClicks(widgetId) {
        const existing = await this.findByWidgetId(widgetId);
        if (existing) {
            await db
                .update(analytics)
                .set({ clicks: sql `${analytics.clicks} + 1` })
                .where(eq(analytics.widget_id, widgetId));
        }
        else {
            await db
                .insert(analytics)
                .values({
                widget_id: widgetId,
                views: 0,
                clicks: 1,
                created_at: new Date()
            });
        }
    }
};
