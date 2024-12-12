import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { widgets, analytics } from "@db/schema";
import { eq } from "drizzle-orm";

const router = Router();

export function setupWidgetRoutes(app: Router) {
  // Get all widgets
  const getAllWidgets: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const result = await db
        .select()
        .from(widgets)
        .where(eq(widgets.userId, req.user.id))
        .orderBy(widgets.createdAt);
      console.log(`[WidgetRoutes] Found ${result.length} widgets for user ${req.user.id}`);
      return res.json({
        success: true,
        data: result.map(widget => ({
          ...widget,
          createdAt: widget.createdAt?.toISOString()
        }))
      });
    } catch (error) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  };

  // Get single widget
  const getWidget: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      const widgetId = parseInt(req.params.id);
      if (isNaN(widgetId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid widget ID"
        });
      }

      const widget = await db.query.widgets.findFirst({
        where: (widgets, { eq, and }) => 
          and(eq(widgets.id, widgetId), eq(widgets.userId, req.user!.id))
      });

      if (!widget) {
        return res.status(404).json({
          success: false,
          error: "Widget not found"
        });
      }

      return res.json({
        success: true,
        data: widget
      });
    } catch (error) {
      console.error('Error fetching widget:', error);
      res.status(500).json({ error: "Failed to fetch widget" });
    }
  };

  // Create widget
  const createWidget: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!req.user?.isPremium) {
        return res.status(403).json({ 
          error: "Premium subscription required",
          code: "PREMIUM_REQUIRED"
        });
      }

      const { name, customization = {}, testimonialIds = [] } = req.body;
      const validatedTestimonialIds = testimonialIds
        .map((id: any) => Number(id))
        .filter((id: number) => !isNaN(id));

      const [result] = await db.insert(widgets).values({
        name,
        userId: req.user.id,
        template: req.body.template || 'default',
        customization,
        createdAt: new Date(),
        testimonialIds: validatedTestimonialIds
      }).returning();

      // Ensure all required fields are present
      const widget = {
        id: result.id,
        name: result.name,
        template: result.template,
        customization: result.customization,
        testimonialIds: result.testimonialIds,
        userId: result.userId,
        createdAt: result.createdAt?.toISOString() || new Date().toISOString()
      };

      res.json(widget);
    } catch (error) {
      console.error('Error creating widget:', error);
      res.status(500).json({ error: "Failed to create widget" });
    }
  };

  // Public embed route
  const getEmbedWidget: RouteHandler = async (req, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      if (isNaN(widgetId)) {
        return res.status(400).json({ error: "Invalid widget ID" });
      }

      const [widget] = await db
        .select()
        .from(widgets)
        .where(eq(widgets.id, widgetId))
        .limit(1);

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Track analytics
      await db.insert(analytics).values({
        widgetId: widget.id,
        views: 1,
        date: new Date()
      });

      res.json({
        widget,
        customization: widget.customization || {
          theme: 'default',
          showRatings: true,
          showImages: true
        }
      });
    } catch (error) {
      console.error('Error serving widget:', error);
      res.status(500).json({ error: "Failed to serve widget" });
    }
  };

  router.get("/embed/:widgetId", getEmbedWidget);

  // Register routes
  router.get("/", requireAuth, getAllWidgets);
  router.get("/:id", getWidget);
  router.post("/", requireAuth, createWidget);

  // Mount routes
  app.use("/widgets", router);
  return router;
}
