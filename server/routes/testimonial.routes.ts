import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { type RouteHandler, requireAuth, getUserId } from "../types/routes";

const router = Router();

export function setupTestimonialRoutes(app: Router): Router {
  interface Testimonial {
  id: number;
  author_name: string;
  content: string;
  rating: number;
  user_id: number;
  status: string;
  source: string;
  created_at: Date;
}

const getAllTestimonials: RouteHandler = async (req, res) => {
    try {
      const userId = getUserId(req);
      const query = `
        SELECT * FROM testimonials 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await db.execute<Testimonial>(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  };

  const createTestimonial: RouteHandler = async (req, res) => {
    try {
      const userId = getUserId(req);
      const { authorName, content, rating } = req.body;
      
      if (!authorName?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Author name and content are required" });
      }

      const parsedRating = Math.min(Math.max(parseInt(rating?.toString() || '5'), 1), 5);
      const query = `
        INSERT INTO testimonials 
        (author_name, content, rating, user_id, status, source, created_at)
        VALUES ($1, $2, $3, $4, 'pending', 'direct', NOW())
        RETURNING *
      `;
      const result = await db.execute(query.toString(), [
        authorName.trim(),
        content.trim(),
        parsedRating,
        userId
      ]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  };

  const deleteTestimonial: RouteHandler = async (req, res) => {
    try {
      const testimonialId = parseInt(req.params.id);
      if (isNaN(testimonialId)) {
        return res.status(400).json({ error: "Invalid testimonial ID" });
      }

      const userId = getUserId(req);
      const query = `
        DELETE FROM testimonials
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await db.execute(query.toString(), [testimonialId, userId]);

      if (!result.rows[0]) {
        return res.status(404).json({ error: "Testimonial not found" });
      }

      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({ error: "Failed to delete testimonial" });
    }
  };

  router.get("/", requireAuth, getAllTestimonials);
  router.post("/", requireAuth, createTestimonial);
  router.delete("/:id", requireAuth, deleteTestimonial);

  app.use("/testimonials", router);
  return router;
}
