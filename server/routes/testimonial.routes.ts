import { Router } from "express";
import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";
import { type RouteHandler, requireAuth, getUserId } from "../types/routes";

const router = Router();

export function setupTestimonialRoutes(app: Router): Router {
  // Get all testimonials for authenticated user
  const getAllTestimonials: RouteHandler = async (req, res) => {
    try {
      const userId = getUserId(req);
      const results = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.userId, userId))
        .orderBy(testimonials.createdAt);

      res.json(results);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  };

  // Create new testimonial
  const createTestimonial: RouteHandler = async (req, res) => {
    try {
      const userId = getUserId(req);
      const { authorName, content, rating } = req.body;
      
      if (!authorName?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Author name and content are required" });
      }

      const parsedRating = Math.min(Math.max(parseInt(rating?.toString() || '5'), 1), 5);

      const [testimonial] = await db
        .insert(testimonials)
        .values({
          authorName: authorName.trim(),
          content: content.trim(),
          rating: parsedRating,
          userId,
          status: 'pending',
          source: 'direct',
          createdAt: new Date(),
        })
        .returning();

      res.json(testimonial);
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  };

  // Delete testimonial
  const deleteTestimonial: RouteHandler = async (req, res) => {
    try {
      const testimonialId = parseInt(req.params.id);
      if (isNaN(testimonialId)) {
        return res.status(400).json({ error: "Invalid testimonial ID" });
      }

      const userId = getUserId(req);

      const result = await db
        .delete(testimonials)
        .where(
          and(
            eq(testimonials.id, testimonialId),
            eq(testimonials.userId, userId)
          )
        )
        .returning();

      if (!result.length) {
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
  router.post("/", requireAuth, createTestimonial);
  router.delete("/:id", requireAuth, deleteTestimonial);

  // Mount routes
  app.use("/testimonials", router);
  return router;
}
