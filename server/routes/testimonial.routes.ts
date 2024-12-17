import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonials } from "@db/schema";
import { eq, sql, and, like, or, desc } from "drizzle-orm";
import cors from 'cors';

const router = Router();

export function setupTestimonialRoutes(app: Router) {
  // Debug middleware for testimonial routes
  router.use((req, res, next) => {
    console.log('[Testimonial Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id,
      isAuthenticated: req.isAuthenticated()
    });
    next();
  });

  // Get all testimonials
  const getAllTestimonials: RouteHandler = async (req, res) => {
    console.log('[Testimonial] Get all request received:', {
      user: req.user?.id,
      session: req.session?.id,
      method: req.method,
      path: req.path,
      isAuthenticated: req.isAuthenticated(),
      headers: req.headers
    });

    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        console.log('[Testimonial] Get all failed: Not authenticated', {
          isAuthenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          session: req.session?.id,
          sessionID: req.sessionID,
          cookies: req.headers.cookie
        });
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const testimonialsList = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.userId, req.user.id))
        .orderBy(desc(testimonials.createdAt));

      console.log(`[Testimonial] Get all success: Found ${testimonialsList.length} testimonials for user ${req.user.id}`);
      
      return res.json({
        success: true,
        data: testimonialsList,
        count: testimonialsList.length
      });
    } catch (error) {
      console.error('[Testimonial] Get all failed with error:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to fetch testimonials",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Create testimonial
  const createTestimonial: RouteHandler = async (req, res) => {
    console.log('[Testimonial] Create request received:', {
      body: req.body,
      user: req.user?.id,
      method: req.method,
      path: req.path
    });

    try {
      if (!req.user?.id) {
        console.log('[Testimonial] Create failed: Not authenticated');
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const { authorName, content, rating } = req.body;
      if (!authorName?.trim() || !content?.trim()) {
        console.log('[Testimonial] Create failed: Missing required fields');
        return res.status(400).json({ 
          success: false,
          error: "Author name and content are required" 
        });
      }

      const parsedRating = Math.min(Math.max(parseInt(rating?.toString() || '5'), 1), 5);
      const [result] = await db.insert(testimonials).values({
        authorName: authorName.trim(),
        content: content.trim(),
        rating: parsedRating,
        userId: req.user.id,
        status: 'pending',
        source: 'direct',
        createdAt: new Date()
      }).returning();

      console.log('[Testimonial] Created successfully:', result);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Testimonial] Create failed with error:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to create testimonial",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Search testimonials
  const searchTestimonials: RouteHandler = async (req, res) => {
    console.log('[Testimonial] Search request received:', {
      body: req.body,
      user: req.user?.id,
      method: req.method,
      path: req.path
    });

    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        console.log('[Testimonial] Search failed: Not authenticated');
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      // Check if user has premium access
      if (!req.user.isPremium) {
        return res.status(403).json({
          success: false,
          error: "PREMIUM_REQUIRED",
          message: "This feature requires a premium subscription"
        });
      }

      const { query = '', status, source } = req.body;
      let conditions = [eq(testimonials.userId, req.user.id)];
      
      if (query?.trim()) {
        const searchTerm = `%${query.toLowerCase().trim()}%`;
        conditions.push(
          sql`(LOWER(${testimonials.content}::text) LIKE ${searchTerm} OR 
              LOWER(${testimonials.authorName}::text) LIKE ${searchTerm})`
        );
      }
      
      if (status) {
        conditions.push(eq(testimonials.status, status));
      }
      
      if (source) {
        conditions.push(eq(testimonials.source, source));
      }

      const searchResults = await db
        .select()
        .from(testimonials)
        .where(and(...conditions))
        .orderBy(desc(testimonials.createdAt));

      return res.json({
        success: true,
        data: searchResults
      });
    } catch (error) {
      console.error('Error searching testimonials:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to search testimonials"
      });
    }
  };

  // Delete testimonial
  const deleteTestimonial: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const testimonialId = parseInt(req.params.id);
      if (isNaN(testimonialId)) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid testimonial ID" 
        });
      }

      const [result] = await db
        .delete(testimonials)
        .where(
          sql`${testimonials.id} = ${testimonialId} AND ${testimonials.userId} = ${req.user.id}`
        )
        .returning();

      if (!result) {
        return res.status(404).json({ 
          success: false,
          error: "Testimonial not found" 
        });
      }

      return res.json({ 
        success: true,
        message: "Testimonial deleted successfully" 
      });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to delete testimonial",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Register routes
  router.get("/", requireAuth, getAllTestimonials);
  router.post("/search", requireAuth, searchTestimonials);
  router.post("/", requireAuth, createTestimonial);
  router.delete("/:id", requireAuth, deleteTestimonial);

  // Mount routes at /testimonials
  app.use("/testimonials", router);
  console.log('[Testimonial] Routes mounted at /testimonials');

  return router;
}