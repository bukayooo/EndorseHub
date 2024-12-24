import { Router } from "express";
import { type RouteHandler, requireAuth } from "../types/routes";
import { testimonialRepository } from "../repositories/testimonial.repository";
import { AppError } from "../../server/lib/error";

export function setupTestimonialRoutes(app: Router) {
  const router = Router();

  // Debug middleware for testimonial routes
  router.use((req, res, next) => {
    console.log('[Testimonial Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id,
      isAuthenticated: req.isAuthenticated(),
      headers: req.headers
    });
    next();
  });

  // Get all testimonials
  const getAllTestimonials: RouteHandler = async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated() || !req.user?.id) {
        console.log('[Testimonial] Get all failed: Not authenticated', {
          isAuthenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          session: req.session?.id,
          headers: req.headers
        });
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      console.log('[Testimonial] Fetching testimonials for user:', req.user.id);

      // Fetch testimonials with error handling
      const testimonialsList = await testimonialRepository.findTestimonialsByUserId(req.user.id);

      console.log('[Testimonial] Found testimonials:', {
        count: testimonialsList.length,
        first: testimonialsList[0],
        last: testimonialsList[testimonialsList.length - 1]
      });

      return res.json({
        success: true,
        data: testimonialsList
      });
    } catch (error: unknown) {
      console.error('[Testimonial] Error fetching testimonials:', error);
      if (error instanceof AppError) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        error: "Failed to fetch testimonials",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Create testimonial
  const createTestimonialHandler: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        console.log('[Testimonial] Create failed: Not authenticated', {
          isAuthenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          session: req.session?.id
        });
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      const { authorName, content, rating, source, sourceMetadata, sourceUrl, platformId } = req.body;

      if (!authorName?.trim() || !content?.trim()) {
        console.log('[Testimonial] Create failed: Missing required fields', {
          hasAuthorName: !!authorName,
          hasContent: !!content
        });
        return res.status(400).json({
          success: false,
          error: "Author name and content are required"
        });
      }

      console.log('[Testimonial] Creating testimonial:', {
        authorName,
        content: content.substring(0, 50) + '...',
        rating,
        userId: req.user.id,
        source,
        platformId
      });

      // Create testimonial with error handling
      const result = await testimonialRepository.createTestimonial({
        authorName: authorName.trim(),
        content: content.trim(),
        rating: rating ? Math.min(Math.max(parseInt(rating.toString()), 1), 5) : undefined,
        userId: req.user.id,
        source,
        sourceMetadata,
        sourceUrl,
        platformId
      });

      console.log('[Testimonial] Created successfully:', result);

      return res.json({
        success: true,
        data: result
      });
    } catch (error: unknown) {
      console.error('[Testimonial] Error creating testimonial:', error);
      if (error instanceof AppError) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        error: "Failed to create testimonial",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Search testimonials route
  const searchTestimonials: RouteHandler = async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      const { query, platform } = req.body;
      if (!query || !platform) {
        return res.status(400).json({
          success: false,
          error: "Query and platform are required"
        });
      }

      // For now, return empty results
      return res.json({
        success: true,
        data: []
      });
    } catch (error: unknown) {
      console.error('[Testimonial] Search error:', error);
      if (error instanceof AppError) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        error: "Failed to search testimonials",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  // Register routes
  router.get("/", requireAuth, getAllTestimonials);
  router.post("/", requireAuth, createTestimonialHandler);
  router.post("/search", requireAuth, searchTestimonials);

  // Mount routes at /testimonials
  app.use("/testimonials", router);
  console.log('[Testimonial] Routes mounted at /testimonials');

  return router;
}