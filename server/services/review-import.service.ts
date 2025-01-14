import { z } from "zod";
import { AppError } from "../lib/error";
import { GooglePlacesService } from "./google-places.service";
import { YelpService } from "./yelp.service";
import { TripAdvisorService } from "./tripadvisor.service";
import { CacheService } from "./cache.service";

const reviewSchema = z.object({
  author_name: z.string(),
  content: z.string(),
  rating: z.number(),
  time: z.number(),
  platform: z.string(),
  profile_url: z.string().optional(),
  review_url: z.string().optional(),
});

export type Review = z.infer<typeof reviewSchema>;

export interface SearchResult {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  platform: string;
  reviews: Review[];
  url?: string;
}

export class ReviewImportService {
  private cache: CacheService<SearchResult[]>;
  private googleService: GooglePlacesService;
  private tripAdvisorService: TripAdvisorService;
  // Temporarily remove Yelp service
  // private yelpService: YelpService;

  constructor() {
    // Initialize cache with 5-minute TTL
    this.cache = new CacheService(300);

    try {
      // Initialize available services
      this.googleService = new GooglePlacesService();
      this.tripAdvisorService = new TripAdvisorService();
      // Temporarily skip Yelp initialization
      // this.yelpService = new YelpService();
    } catch (error) {
      console.error("Error initializing review services:", error);
      throw new AppError(
        "SERVICE_INITIALIZATION_ERROR",
        error instanceof Error ? error.message : "Failed to initialize review services"
      );
    }

    // Set up periodic cache cleanup
    setInterval(() => this.cache.cleanup(), 60000); // Clean up every minute
  }

  public async searchBusinesses(query: string): Promise<SearchResult[]> {
    try {
      // Check cache first
      const cacheKey = `search:${query.toLowerCase()}`;
      const cachedResults = this.cache.get(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Search available platforms in parallel
      const searchPromises: Promise<SearchResult[]>[] = [];

      searchPromises.push(
        this.googleService.searchBusinesses(query).catch(error => {
          console.error("Google Places API error:", error);
          return [];
        })
      );

      // Temporarily remove Yelp search
      // searchPromises.push(
      //   this.yelpService.searchBusinesses(query).catch(error => {
      //     console.error("Yelp API error:", error);
      //     return [];
      //   })
      // );

      searchPromises.push(
        this.tripAdvisorService.searchBusinesses(query).catch(error => {
          console.error("TripAdvisor API error:", error);
          return [];
        })
      );

      // Wait for all searches to complete
      const results = await Promise.allSettled(searchPromises);

      // Combine successful results
      const allResults = results
        .filter((result): result is PromiseFulfilledResult<SearchResult[]> => 
          result.status === "fulfilled"
        )
        .flatMap(result => result.value);

      // Sort by rating (highest first) and then by number of reviews
      const sortedResults = allResults.sort((a, b) => {
        if (a.rating && b.rating) {
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.reviews.length - a.reviews.length;
        }
        return 0;
      });

      // Cache the results
      this.cache.set(cacheKey, sortedResults);

      return sortedResults;
    } catch (error) {
      console.error("Error searching businesses:", error);
      throw new AppError(
        "SEARCH_ERROR",
        error instanceof Error ? error.message : "Failed to search businesses across platforms"
      );
    }
  }

  public validateReview(review: unknown): Review {
    const result = reviewSchema.safeParse(review);
    if (!result.success) {
      throw new AppError("INVALID_REVIEW", "Invalid review data");
    }
    return result.data;
  }

  private async searchTripAdvisor(query: string): Promise<SearchResult[]> {
    if (!this.tripAdvisorService) {
      return [];
    }

    try {
      const results = await this.tripAdvisorService.searchBusinesses(query);
      return results.map(location => ({
        place_id: location.place_id,
        name: location.name,
        address: location.address || '',
        rating: location.rating,
        platform: 'tripadvisor',
        reviews: location.reviews.map(review => ({
          author_name: review.author_name,
          content: review.content,
          rating: review.rating,
          time: review.time,
          platform: 'tripadvisor',
          profile_url: review.profile_url,
          review_url: review.review_url
        }))
      }));
    } catch (error) {
      console.error('[ReviewImport] TripAdvisor search error:', error);
      return [];
    }
  }
} 