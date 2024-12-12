import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";

const router = Router();

export function setupTestimonialRoutes(app: Router) {
  // Get all testimonials
  const getAllTestimonials: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const result = await db.execute(`
        SELECT * FROM testimonials 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [req.user.id]);
      res.json(result.rows);
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
      const result = await db.execute(`
        INSERT INTO testimonials 
        (author_name, content, rating, user_id, status, source, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
        RETURNING *
      `, [authorName.trim(), content.trim(), parsedRating, req.user.id, 'pending', 'direct']);
      res.json(result.rows[0]);
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

      const result = await db.execute(`
        DELETE FROM testimonials 
        WHERE id = $1 AND user_id = $2 
        RETURNING *
      `, [testimonialId, req.user.id]);

      if (!result.rows[0]) {
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
