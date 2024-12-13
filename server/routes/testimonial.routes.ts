import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonials } from "@db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

export function setupTestimonialRoutes(app: Router) {
  const getAllTestimonials: RouteHandler = async (req, res) => {
    try {
      console.log('[Testimonial] Request received:', { 
        authenticated: req.isAuthenticated(),
        userId: req.user?.id,
        session: req.sessionID 
      });

      // Check authentication status
      if (!req.isAuthenticated()) {
        console.log('[Testimonial] Not authenticated');
        return res.status(401).json({ 
          success: false, 
          error: "Authentication required" 
        });
      }

      // Ensure user ID exists
      if (!req.user?.id) {
        console.log('[Testimonial] No user ID in session');
        return res.status(401).json({ 
          success: false, 
          error: "User ID not found" 
        });
      }

      console.log('[Testimonial] Fetching testimonials for user:', req.user.id);
      
      // Execute query with explicit type casting
      const results = await db
        .select({
          id: testimonials.id,
          authorName: testimonials.authorName,
          content: testimonials.content,
          rating: testimonials.rating,
          status: testimonials.status,
          source: testimonials.source,
          createdAt: testimonials.createdAt,
          userId: testimonials.userId
        })
        .from(testimonials)
        .where(eq(testimonials.userId, req.user.id))
        .orderBy(desc(testimonials.createdAt));

      console.log('[Testimonial] Query results:', {
        userId: req.user.id,
        resultCount: results.length,
        firstResult: results[0] || 'No testimonials found'
      });

      const formattedResults = results.map(t => ({
        id: t.id,
        authorName: t.authorName,
        content: t.content,
        rating: t.rating,
        status: t.status || 'approved',
        source: t.source || 'direct',
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
        userId: t.userId
      }));

      return res.json({
        success: true,
        data: formattedResults
      });
    } catch (error) {
      console.error('[Testimonial] Error fetching testimonials:', error);
      if (error instanceof Error) {
        console.error('[Testimonial] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return res.status(500).json({ 
        success: false,
        error: "Failed to fetch testimonials"
      });
    }
  };

  const createTestimonial: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const { authorName, content, rating } = req.body;
      
      if (!authorName?.trim() || !content?.trim()) {
        return res.status(400).json({ 
          success: false,
          error: "Author name and content are required" 
        });
      }

      const [result] = await db.insert(testimonials).values({
        authorName: authorName.trim(),
        content: content.trim(),
        rating: rating || 5,
        userId: req.user.id,
        status: 'approved',
        source: 'direct',
        createdAt: new Date()
      }).returning();

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Testimonial] Error creating testimonial:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to create testimonial"
      });
    }
  };

  // Register routes
  router.get("/", requireAuth, getAllTestimonials);
  router.post("/", requireAuth, createTestimonial);

  // Mount routes
  app.use("/testimonials", router);
  return router;
}