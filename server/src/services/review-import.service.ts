import { z } from 'zod';
import { GooglePlacesService } from './google-places.service';
import { YelpService } from './yelp.service';
import { TripAdvisorService } from './tripadvisor.service';

export const reviewSchema = z.object({
  author_name: z.string().min(1, 'Author name is required'),
  content: z.string().min(1, 'Review content is required'),
  rating: z.number().min(1).max(5),
  time: z.number(),
  platform: z.enum(['google', 'yelp', 'tripadvisor']),
  profile_url: z.string().url().optional(),
  profile_photo_url: z.string().url().optional(),
  review_url: z.string().url().optional(),
  source_metadata: z.record(z.unknown()).optional(),
  source_url: z.string().url().optional(),
  platform_id: z.string().optional(),
  user_id: z.string().optional(),
  status: z.string().optional(),
  created_at: z.string().optional()
});

export type Review = z.infer<typeof reviewSchema>;

export const searchResultSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  address: z.string(),
  rating: z.number(),
  platform: z.enum(['google', 'yelp', 'tripadvisor']),
  reviews: z.array(reviewSchema),
  url: z.string().url().optional()
});

export type SearchResult = z.infer<typeof searchResultSchema>;

export class ReviewImportService {
  constructor(
    private readonly googlePlacesService: GooglePlacesService,
    private readonly yelpService: YelpService,
    private readonly tripAdvisorService: TripAdvisorService
  ) {}

  validateReview(review: unknown): Review {
    return reviewSchema.parse(review);
  }

  private async searchPlatform(
    service: GooglePlacesService | YelpService | TripAdvisorService,
    query: string
  ): Promise<SearchResult[]> {
    try {
      const results = await service.searchBusinesses(query);
      return results.map(result => searchResultSchema.parse(result));
    } catch (error) {
      console.error('Platform search error:', error);
      return [];
    }
  }

  async searchBusinesses(query: string): Promise<SearchResult[]> {
    const results = await Promise.allSettled([
      this.searchPlatform(this.googlePlacesService, query),
      this.searchPlatform(this.yelpService, query),
      this.searchPlatform(this.tripAdvisorService, query)
    ]);

    const allResults = results
      .filter((result): result is PromiseFulfilledResult<SearchResult[]> => 
        result.status === 'fulfilled')
      .flatMap(result => result.value);

    // Sort by rating (descending) and number of reviews (descending)
    return allResults.sort((a, b) => {
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }
      return b.reviews.length - a.reviews.length;
    });
  }
} 