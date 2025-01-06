import { Router } from "express";
import { db } from "../../db";
import { testimonials } from "../../db/schema";
import type { Testimonial } from "../../db/schema";
import { sql } from "drizzle-orm";
import { type RouteHandler, requireAuth } from "../types/routes";

export function setupTestimonialRoutes(app: Router) {
  const router = Router();

  // Get all testimonials
  router.get('/', requireAuth, async (req, res) => {
    try {
      const result = await db.select()
        .from(testimonials)
        .where(sql`${testimonials.userId} = ${req.user!.id}`)
        .orderBy(sql`${testimonials.createdAt} DESC`);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch testimonials' });
    }
  });

  // Create testimonial
  router.post('/', requireAuth, async (req, res) => {
    try {
      const result = await db.insert(testimonials)
        .values({
          ...req.body,
          userId: req.user!.id,
          status: 'pending',
          createdAt: new Date()
        })
        .returning();
      res.json({ success: true, data: result[0] });
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ success: false, error: 'Failed to create testimonial' });
    }
  });

  // Update testimonial
  router.put('/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await db.update(testimonials)
        .set(req.body)
        .where(sql`${testimonials.id} = ${id} AND ${testimonials.userId} = ${req.user!.id}`)
        .returning();
      
      if (!result.length) {
        return res.status(404).json({ success: false, error: 'Testimonial not found' });
      }
      
      res.json({ success: true, data: result[0] });
    } catch (error) {
      console.error('Error updating testimonial:', error);
      res.status(500).json({ success: false, error: 'Failed to update testimonial' });
    }
  });

  // Delete testimonial
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(testimonials)
        .where(sql`${testimonials.id} = ${id} AND ${testimonials.userId} = ${req.user!.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({ success: false, error: 'Failed to delete testimonial' });
    }
  });

  // Search testimonials
  router.post('/search', requireAuth, async (req, res) => {
    try {
      const { query } = req.body;
      const searchTerm = `%${query.toLowerCase()}%`;
      const result = await db.select()
        .from(testimonials)
        .where(sql`${testimonials.userId} = ${req.user!.id} AND (
          LOWER(${testimonials.content}) LIKE ${searchTerm} OR 
          LOWER(${testimonials.authorName}) LIKE ${searchTerm}
        )`)
        .orderBy(sql`${testimonials.createdAt} DESC`);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error searching testimonials:', error);
      res.status(500).json({ success: false, error: 'Failed to search testimonials' });
    }
  });

  app.use('/testimonials', router);
  return router;
}