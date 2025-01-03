import { Router } from 'express';
import { db, eq, count } from '../db';
import { analytics, testimonials, widgets } from '../db/schema';
import type { Analytics } from '../db/schema';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get analytics stats for the authenticated user
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const [testimonialCount] = await db
      .select({ count: count() })
      .from(testimonials)
      .where(eq(testimonials.userId, req.user.id));

    const [widgetCount] = await db
      .select({ count: count() })
      .from(widgets)
      .where(eq(widgets.userId, req.user.id));

    const analyticsData = await db
      .select()
      .from(analytics)
      .where(eq(analytics.userId, req.user.id));

    const totalViews = analyticsData.reduce((sum, item) => sum + item.views, 0);
    const totalClicks = analyticsData.reduce((sum, item) => sum + item.clicks, 0);
    const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    res.json({
      data: {
        testimonialCount: testimonialCount.count,
        widgetCount: widgetCount.count,
        viewCount: totalViews,
        clickCount: totalClicks,
        conversionRate: conversionRate.toFixed(2) + '%',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record a widget view
router.post('/view/:widgetId', async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const [analyticsRecord] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.widgetId, widgetId));

    if (analyticsRecord) {
      await db
        .update(analytics)
        .set({ views: analyticsRecord.views + 1 })
        .where(eq(analytics.id, analyticsRecord.id));
    } else {
      await db.insert(analytics).values({
        widgetId,
        views: 1,
        clicks: 0,
      });
    }

    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record a widget click
router.post('/click/:widgetId', async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const [analyticsRecord] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.widgetId, widgetId));

    if (analyticsRecord) {
      await db
        .update(analytics)
        .set({ clicks: analyticsRecord.clicks + 1 })
        .where(eq(analytics.id, analyticsRecord.id));
    } else {
      await db.insert(analytics).values({
        widgetId,
        views: 0,
        clicks: 1,
      });
    }

    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 