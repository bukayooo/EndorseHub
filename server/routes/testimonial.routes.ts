import { Router } from "express";
import { db } from "../../db";
import { testimonials } from "../../db/schema";
import type { Testimonial } from "../../db/schema";
import { sql } from "drizzle-orm";
import { type RouteHandler, requireAuth } from "../types/routes";
import { requirePremium } from "../middleware/auth";
import { ReviewImportService } from "../services/review-import.service";
import { GooglePlacesService } from "../services/google-places.service";
import { YelpService } from "../services/yelp.service";
import { TripAdvisorService } from "../services/tripadvisor.service";

// Initialize services
const googlePlacesService = new GooglePlacesService();
const yelpService = new YelpService();
const tripAdvisorService = new TripAdvisorService();
const reviewImportService = new ReviewImportService();

export function setupTestimonialRoutes(app: Router) {
  const router = Router();

  // Get all testimonials
  router.get('/', requireAuth, async (req, res) => {
    try {
      const result = await db.select()
        .from(testimonials)
        .where(sql`${testimonials.user_id} = ${req.user!.id}`)
        .orderBy(sql`${testimonials.created_at} DESC`);
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
          user_id: req.user!.id,
          status: 'pending',
          created_at: new Date()
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
        .where(sql`${testimonials.id} = ${id} AND ${testimonials.user_id} = ${req.user!.id}`)
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
        .where(sql`${testimonials.id} = ${id} AND ${testimonials.user_id} = ${req.user!.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({ success: false, error: 'Failed to delete testimonial' });
    }
  });

  // Search testimonials
  router.post('/search', requireAuth, requirePremium, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string' || query.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Query must be at least 3 characters long'
        });
      }

      const results = await reviewImportService.searchBusinesses(query);
      return res.json({ success: true, data: results });
    } catch (error) {
      console.error('Search businesses error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search businesses'
      });
    }
  });

  app.use('/testimonials', router);
  return router;
}