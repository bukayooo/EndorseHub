import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { widgets, analytics } from "../../db/schema";
import { eq } from "drizzle-orm";
import { sql } from 'drizzle-orm';

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
          testimonialIds: widgets.testimonialIds,
          createdAt: widgets.createdAt
        })
        .from(widgets)
        .where(eq(widgets.userId, req.user.id))
        .orderBy(sql`${widgets.createdAt} DESC`);
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
      console.log('[Widget] Create request:', {
        body: req.body,
        user: req.user?.id
      });

      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      if (!req.user?.isPremium) {
        return res.status(403).json({ 
          success: false,
          error: "Premium subscription required",
          code: "PREMIUM_REQUIRED"
        });
      }

      const { name, template = 'default', customization = {}, testimonialIds = [] } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: "Name is required" 
        });
      }

      const validatedTestimonialIds = Array.isArray(testimonialIds) 
        ? testimonialIds
            .map((id: any) => Number(id))
            .filter((id: number) => !isNaN(id))
        : [];

      console.log('[Widget] Creating widget:', {
        name,
        template,
        userId: req.user.id,
        testimonialCount: validatedTestimonialIds.length
      });

      const [result] = await db.insert(widgets).values({
        name,
        userId: req.user.id,
        template: template || 'default',
        customization,
        createdAt: new Date(),
        testimonialIds: validatedTestimonialIds
      }).returning();

      console.log('[Widget] Created widget:', result);

      return res.json({
        success: true,
        data: {
          id: result.id,
          name: result.name,
          template: result.template,
          customization: result.customization,
          testimonialIds: result.testimonialIds,
          userId: result.userId,
          createdAt: result.createdAt?.toISOString() || new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error creating widget:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to create widget" 
      });
    }
  };

  // Register routes
  router.get("/", requireAuth, getAllWidgets);
  router.post("/", requireAuth, createWidget);

  // Mount routes at /widgets
  app.use("/widgets", router);
  console.log('[Widget] Routes mounted at /widgets');
  return router;
}