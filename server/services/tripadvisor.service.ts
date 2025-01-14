import { AppError } from "../lib/error";
import type { SearchResult } from "./review-import.service";
import { apiKeysManager } from "../config/api-keys";

interface TripAdvisorLocationResponse {
  data: Array<{
    location_id: string;
    name: string;
    rating: number;
    address_obj: {
      street1?: string;
      city?: string;
    };
  }>;
}

interface TripAdvisorReviewResponse {
  data: Array<{
    text: string;
    rating: number;
    published_date: string;
    url: string;
    user: {
      username: string;
      userProfile: string;
    };
  }>;
}

export class TripAdvisorService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.content.tripadvisor.com/api/v1";

  constructor() {
    // API keys are already initialized at server startup
    const keys = apiKeysManager.getKeys();
    const apiKey = keys.TRIPADVISOR_API_KEY;
    if (!apiKey) {
      throw new AppError("CONFIG_ERROR", "TripAdvisor API key is not configured");
    }
    this.apiKey = apiKey;
  }

  public async searchBusinesses(query: string): Promise<SearchResult[]> {
    try {
      // Search for locations
      const searchUrl = `${this.baseUrl}/location/search?key=${this.apiKey}&searchQuery=${encodeURIComponent(query)}&language=en`;
      console.log('[TripAdvisor] Searching locations:', { 
        url: searchUrl.replace(this.apiKey, '***') // Log URL without exposing API key
      });
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://endorsehub.com'
        }
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('[TripAdvisor] API error details:', {
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          response: errorText,
          headers: Object.fromEntries(searchResponse.headers.entries())
        });
        throw new Error(`TripAdvisor API error: ${searchResponse.statusText} (${searchResponse.status}) - ${errorText}`);
      }

      const data = await searchResponse.json() as TripAdvisorLocationResponse;
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response from TripAdvisor API');
      }

      // Fetch reviews for each location
      const places = await Promise.all(
        data.data.slice(0, 5).map(async (location) => {
          const reviewsUrl = `${this.baseUrl}/location/${location.location_id}/reviews?key=${this.apiKey}&language=en`;
          const reviewsResponse = await fetch(reviewsUrl, {
            headers: {
              'Accept': 'application/json',
              'Referer': 'https://endorsehub.com'
            }
          });

          if (!reviewsResponse.ok) {
            return null;
          }

          const reviewsData = await reviewsResponse.json() as TripAdvisorReviewResponse;
          if (reviewsData.data && Array.isArray(reviewsData.data)) {
            return {
              place_id: location.location_id,
              name: location.name,
              address: location.address_obj ? `${location.address_obj.street1 || ''}, ${location.address_obj.city || ''}` : '',
              rating: location.rating,
              platform: 'tripadvisor',
              reviews: reviewsData.data.map((review) => ({
                author_name: review.user.username,
                content: review.text,
                rating: review.rating,
                time: Math.floor(new Date(review.published_date).getTime() / 1000),
                platform: 'tripadvisor',
                profile_url: review.user.userProfile,
                review_url: review.url
              })),
            } satisfies SearchResult;
          }
          return null;
        })
      );

      // Filter out null results and places without reviews
      return places
        .filter((place): place is NonNullable<typeof place> => place !== null)
        .filter(place => place.reviews.length > 0) as SearchResult[];
    } catch (error) {
      console.error("Error fetching from TripAdvisor API:", error);
      throw new AppError(
        "API_ERROR",
        error instanceof Error ? error.message : "Failed to fetch from TripAdvisor API"
      );
    }
  }
} 