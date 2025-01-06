import { z } from "zod";
import { AppError } from "../lib/error";
import { GooglePlacesService } from "./google-places.service";
import { YelpService } from "./yelp.service";
import { TripAdvisorService } from "./tripadvisor.service";
import { CacheService } from "./cache.service";

const reviewSchema = z.object({
  authorName: z.string(),
  content: z.string(),
  rating: z.number(),
  time: z.number(),
  platform: z.string(),
  profileUrl: z.string().optional(),
  reviewUrl: z.string().optional(),
});

export type Review = z.infer<typeof reviewSchema>;

export interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  platform: string;
  reviews: Review[];
  url?: string;
}

export class ReviewImportService {
  private googleService: GooglePlacesService | null = null;
  private yelpService: YelpService | null = null;
  private tripAdvisorService: TripAdvisorService | null = null;
  private cache: CacheService<SearchResult[]>;

  constructor() {
    // Initialize cache with 5-minute TTL
    this.cache = new CacheService(300);

    try {
      this.googleService = new GooglePlacesService();
    } catch (error) {
      console.warn("Google Places service not available:", error);
    }

    try {
      this.yelpService = new YelpService();
    } catch (error) {
      console.warn("Yelp service not available:", error);
    }

    try {
      this.tripAdvisorService = new TripAdvisorService();
    } catch (error) {
      console.warn("TripAdvisor service not available:", error);
    }

    if (!this.googleService && !this.yelpService && !this.tripAdvisorService) {
      throw new AppError(
        "CONFIG_ERROR",
        "No review platforms are configured. At least one platform must be available."
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

      // Search all available platforms in parallel
      const searchPromises: Promise<SearchResult[]>[] = [];

      if (this.googleService) {
        searchPromises.push(this.googleService.searchBusinesses(query));
      }
      if (this.yelpService) {
        searchPromises.push(this.yelpService.searchBusinesses(query));
      }
      if (this.tripAdvisorService) {
        searchPromises.push(this.tripAdvisorService.searchBusinesses(query));
      }

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
        "Failed to search for businesses across platforms"
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
} 