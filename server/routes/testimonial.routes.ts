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
import { AppError } from "../errors/app-error";

// Create review import service
let reviewImportService: ReviewImportService | null = null;

export function setupTestimonialRoutes(app: Router) {
  const router = Router();

  // Initialize the review import service
  try {
    reviewImportService = new ReviewImportService();
  } catch (error) {
    console.error('Error initializing review services:', error);
  }

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

      if (!reviewImportService) {
        return res.status(503).json({
          success: false,
          error: 'Service is initializing, please try again in a moment'
        });
      }

      const results = await reviewImportService.searchBusinesses(query);
      return res.json({ success: true, data: results });
    } catch (error: unknown) {
      console.error('Search businesses error:', error);
      if (error instanceof AppError) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: error.code
        });
      }
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search businesses'
      });
    }
  });

  // Import review
  router.post('/import', requireAuth, requirePremium, async (req, res) => {
    try {
      const { placeId, review } = req.body;
      
      if (!placeId || !review) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Log the incoming data
      console.log('[Import] Received data:', { placeId, review });

      const result = await db.insert(testimonials)
        .values({
          user_id: req.user!.id,
          author_name: review.author_name || 'Anonymous',
          content: review.content || '',
          rating: review.rating || 0,
          status: 'pending',
          source: review.platform?.toLowerCase() || 'direct',
          source_metadata: {
            placeId,
            platform: review.platform,
            profileUrl: review.profile_url,
            reviewUrl: review.review_url,
            time: review.time
          },
          source_url: review.review_url || null,
          platform_id: placeId,
          created_at: new Date()
        })
        .returning();

      return res.json({ 
        success: true, 
        data: result[0] 
      });
    } catch (error) {
      console.error('Import review error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import review'
      });
    }
  });

  app.use('/testimonials', router);
  return router;
}