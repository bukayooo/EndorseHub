import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { widgets, analytics, testimonials } from "@db/schema";
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { PgArray, integer } from 'drizzle-orm/pg-core';
import { isAuthenticated, requirePremium } from "../middleware/auth";

const router = Router();

export function setupWidgetRoutes(app: Router) {
  // Debug middleware
  router.use((req, res, next) => {
    console.log('[Widget Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id
    });
    next();
  });

  // Get all widgets
  const getAllWidgets: RouteHandler = async (req, res) => {
    try {
      console.log('[Widget] Get all request:', {
        sessionID: req.sessionID,
        isAuth: req.isAuthenticated(),
        userId: req.user?.id
      });

      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: "Authentication required" 
        });
      }

      console.log('[Widget] User authenticated:', req.user.id);

      console.log('[WidgetRoutes] Fetching widgets for user:', req.user.id);
      const result = await db
        .select({
          id: widgets.id,
          name: widgets.name,
          template: widgets.template,
          customization: widgets.customization,
          testimonial_ids: widgets.testimonial_ids,
          created_at: widgets.created_at,
          user_id: widgets.user_id
        })
        .from(widgets)
        .where(eq(widgets.user_id, req.user.id))
        .orderBy(sql`${widgets.created_at} DESC`);
      console.log('[WidgetRoutes] Found widgets:', result?.length || 0);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching widgets:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to fetch widgets" 
      });
    }
  };

  // Create widget
  const createWidget: RouteHandler = async (req, res) => {
    try {
      const { name, template, customization, testimonialIds } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      console.log('[WidgetRoutes] Creating widget:', {
        name,
        template,
        customization,
        testimonialIds
      });

      // Ensure testimonialIds is an array and all elements are numbers
      const validatedTestimonialIds = Array.isArray(testimonialIds) 
        ? testimonialIds.filter(id => typeof id === 'number')
        : [];

      console.log('[WidgetRoutes] Validated testimonial IDs:', validatedTestimonialIds);

      const [widget] = await db
        .insert(widgets)
        .values({
          name,
          user_id: userId,
          template,
          customization,
          testimonial_ids: validatedTestimonialIds
        })
        .returning();

      console.log('[WidgetRoutes] Created widget:', widget);

      // Fetch associated testimonials for the response
      const widgetTestimonials = validatedTestimonialIds.length > 0 
        ? await db
            .select()
            .from(testimonials)
            .where(inArray(testimonials.id, validatedTestimonialIds))
        : [];

      return res.json({
        success: true,
        data: {
          ...widget,
          testimonials: widgetTestimonials
        }
      });
    } catch (error) {
      console.error('[WidgetRoutes] Error creating widget:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create widget'
      });
    }
  };

  // Get single widget
  const getWidget: RouteHandler = async (req, res) => {
    try {
      const widgetId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      console.log('[WidgetRoutes] Fetching widget:', widgetId);

      const [widget] = await db
        .select({
          id: widgets.id,
          name: widgets.name,
          template: widgets.template,
          customization: widgets.customization,
          testimonial_ids: sql<number[]>`COALESCE(${widgets.testimonial_ids}, ARRAY[]::integer[])`,
          created_at: widgets.created_at,
          user_id: widgets.user_id
        })
        .from(widgets)
        .where(eq(widgets.id, widgetId))
        .limit(1);

      console.log('[WidgetRoutes] Found widget:', widget);

      if (!widget) {
        return res.status(404).json({
          success: false,
          error: 'Widget not found'
        });
      }

      if (widget.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Fetch associated testimonials
      const testimonialIds = widget.testimonial_ids || [];
      console.log('[WidgetRoutes] Fetching testimonials for IDs:', testimonialIds);

      const widgetTestimonials = testimonialIds.length > 0 
        ? await db
            .select()
            .from(testimonials)
            .where(inArray(testimonials.id, testimonialIds))
        : [];

      console.log('[WidgetRoutes] Found testimonials:', widgetTestimonials.length);

      return res.json({
        success: true,
        data: {
          ...widget,
          testimonials: widgetTestimonials
        }
      });
    } catch (error) {
      console.error('[WidgetRoutes] Error fetching widget:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch widget'
      });
    }
  };

  // Delete widget
  const deleteWidget: RouteHandler = async (req, res) => {
    try {
      const widgetId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      console.log('[WidgetRoutes] Deleting widget:', widgetId);

      // First check if the widget exists and belongs to the user
      const [widget] = await db
        .select()
        .from(widgets)
        .where(sql`${widgets.id} = ${widgetId} AND ${widgets.user_id} = ${userId}`)
        .limit(1);

      if (!widget) {
        return res.status(404).json({
          success: false,
          error: 'Widget not found'
        });
      }

      // Delete the widget
      await db
        .delete(widgets)
        .where(sql`${widgets.id} = ${widgetId} AND ${widgets.user_id} = ${userId}`);

      console.log('[WidgetRoutes] Widget deleted:', widgetId);

      return res.json({
        success: true,
        data: null
      });
    } catch (error) {
      console.error('[WidgetRoutes] Error deleting widget:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete widget'
      });
    }
  };

  // Register routes
  router.get("/", requireAuth, getAllWidgets);
  router.get("/:id", requireAuth, getWidget);
  router.post("/", requireAuth, requirePremium, createWidget);
  router.delete("/:id", requireAuth, deleteWidget);

  // Mount routes at /widgets
  app.use("/widgets", router);
  console.log('[Widget] Routes mounted at /widgets');
  return router;
}