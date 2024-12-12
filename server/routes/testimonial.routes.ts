import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonials } from "@db/schema";
import { eq, sql, and, like } from "drizzle-orm";

const router = Router();

export function setupTestimonialRoutes(app: Router) {
  // Get all testimonials
  const getAllTestimonials: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const testimonialsList = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.userId, req.user.id));

      console.log(`GET /testimonials - Found ${testimonialsList.length} testimonials for user ${req.user.id}`);
      
      return res.json({
        success: true,
        data: testimonialsList
      });
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to fetch testimonials",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Create testimonial
  const createTestimonial: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { authorName, content, rating } = req.body;
      if (!authorName?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Author name and content are required" });
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

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  };

  // Search testimonials
  const searchTestimonials: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const { query = '', status, source } = req.body;
      let conditions = [eq(testimonials.userId, req.user.id)];
      
      if (query?.trim()) {
        const searchTerm = `%${query.toLowerCase().trim()}%`;
        conditions.push(
          sql`(LOWER(${testimonials.content}) LIKE ${searchTerm} OR 
              LOWER(${testimonials.authorName}) LIKE ${searchTerm})`
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
        .orderBy(sql`${testimonials.createdAt} DESC`);

      console.log(`[Search] Found ${searchResults.length} testimonials for user ${req.user.id}`);
      return res.json({
        success: true,
        data: searchResults
      });
    } catch (error) {
      console.error('Error searching testimonials:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to search testimonials",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Delete testimonial
  const deleteTestimonial: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const testimonialId = parseInt(req.params.id);
      if (isNaN(testimonialId)) {
        return res.status(400).json({ error: "Invalid testimonial ID" });
      }

      const [result] = await db
        .delete(testimonials)
        .where(
          sql`${testimonials.id} = ${testimonialId} AND ${testimonials.userId} = ${req.user.id}`
        )
        .returning();

      if (!result) {
        return res.status(404).json({ error: "Testimonial not found" });
      }

      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({ error: "Failed to delete testimonial" });
    }
  };

  // Register routes
  router.get("/", requireAuth, getAllTestimonials);
  router.post("/search", requireAuth, searchTestimonials);
  router.post("/", requireAuth, createTestimonial);
  router.delete("/:id", requireAuth, deleteTestimonial);

  // Mount routes
  app.use("/testimonials", router);
  return router;
}
