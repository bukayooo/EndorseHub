import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonials } from "@db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

export function setupTestimonialRoutes(app: Router) {
  // Get all testimonials
  const getAllTestimonials: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const result = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.userId, req.user.id))
        .orderBy(testimonials.createdAt);
      res.json(result);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
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
      res.json(result);
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ error: "Failed to create testimonial" });
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
  router.post("/", requireAuth, createTestimonial);
  router.delete("/:id", requireAuth, deleteTestimonial);

  // Mount routes
  app.use("/testimonials", router);
  return router;
}
