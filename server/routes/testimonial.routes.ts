import { Router } from "express";
import { and, sql } from "drizzle-orm";
import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq } from "drizzle-orm";
import { type RouteHandler, requireAuth } from "../types/routes";

const router = Router();

export function setupTestimonialRoutes(app: Router) {
  // Get all testimonials for authenticated user
  const getAllTestimonials: RouteHandler = async (req, res) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const results = await db
        .select()
        .from(testimonials)
        .where(sql`${testimonials.userId} = ${req.user.id}`)
        .orderBy(testimonials.createdAt);

      res.json(results);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  };

  // Create new testimonial
  const createTestimonial: RouteHandler = async (req, res) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { authorName, content, rating } = req.body as {
        authorName: string;
        content: string;
        rating?: number;
      };
      
      if (!authorName?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Author name and content are required" });
      }

      const [testimonial] = await db.insert(testimonials)
        .values({
          authorName: authorName.trim(),
          content: content.trim(),
          rating: Math.min(Math.max(parseInt(rating?.toString() || '5'), 1), 5),
          userId: req.user.id,
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
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const testimonialId = parseInt(req.params.id);
      
      const [testimonial] = await db
        .select()
        .from(testimonials)
        .where(sql`${testimonials.id} = ${testimonialId} AND ${testimonials.userId} = ${req.user.id}`)
        .limit(1);

      if (!testimonial) {
        return res.status(404).json({ error: "Testimonial not found" });
      }

      await db.delete(testimonials)
        .where(sql`${testimonials.id} = ${testimonialId} AND ${testimonials.userId} = ${req.user.id}`);

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