import { Router } from 'express';
import { ReviewImportService } from '../services/review-import.service';
import { GooglePlacesService } from '../services/google-places.service';
import { YelpService } from '../services/yelp.service';
import { TripAdvisorService } from '../services/tripadvisor.service';

const router = Router();

// Initialize services
const googlePlacesService = new GooglePlacesService();
const yelpService = new YelpService();
const tripAdvisorService = new TripAdvisorService();
const reviewImportService = new ReviewImportService(
  googlePlacesService,
  yelpService,
  tripAdvisorService
);

// Search businesses across all platforms
router.post('/search-businesses', async (req, res) => {
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

// Import a review
router.post('/import', async (req, res) => {
  try {
    const { placeId, review } = req.body;
    if (!placeId || !review) {
      return res.status(400).json({
        success: false,
        error: 'Place ID and review are required'
      });
    }

    const validatedReview = reviewImportService.validateReview(review);
    
    // Create testimonial from the imported review
    const testimonial = {
      user_id: req.user?.id,
      author_name: validatedReview.authorName,
      content: validatedReview.content,
      rating: validatedReview.rating,
      created_at: new Date(validatedReview.time),
      source: validatedReview.platform,
      source_url: validatedReview.reviewUrl,
      source_metadata: {
        placeId,
        profileUrl: validatedReview.profileUrl,
        profilePhotoUrl: validatedReview.profilePhotoUrl
      }
    };

    // TODO: Save testimonial to database
    // For now, just return the formatted testimonial
    return res.json({ success: true, data: testimonial });
  } catch (error) {
    console.error('Import review error:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import review'
    });
  }
});

export default router; 