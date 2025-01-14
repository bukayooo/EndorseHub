import { AppError } from "../lib/error";
import type { SearchResult } from "./review-import.service";
import { apiKeysManager } from "../config/api-keys";

interface YelpBusinessResponse {
  businesses: Array<{
    id: string;
    name: string;
    rating: number;
    url: string;
    location: {
      address1?: string;
      city?: string;
    };
  }>;
}

interface YelpReviewResponse {
  reviews: Array<{
    id: string;
    url: string;
    text: string;
    rating: number;
    time_created: string;
    user: {
      name: string;
      profile_url: string;
    };
  }>;
}

export class YelpService {
  private apiKey: string | null = null;
  private readonly baseUrl = "https://api.yelp.com/v3";

  constructor() {
    // API keys are already initialized at server startup
    const keys = apiKeysManager.getKeys();
    this.apiKey = keys.YELP_API_KEY;
    if (!this.apiKey) {
      throw new AppError("CONFIG_ERROR", "Yelp API key is not configured");
    }
  }

  public async searchBusinesses(query: string): Promise<SearchResult[]> {
    try {
      // Search for businesses
      const searchUrl = `${this.baseUrl}/businesses/search?term=${encodeURIComponent(query)}&location=United States&limit=5`;
      console.log('[Yelp] Searching businesses:', { url: searchUrl });
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        }
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('[Yelp] API error details:', {
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          response: errorText,
          headers: Object.fromEntries(searchResponse.headers.entries())
        });
        throw new Error(`Yelp API error: ${searchResponse.statusText} (${searchResponse.status}) - ${errorText}`);
      }

      const data = await searchResponse.json() as YelpBusinessResponse;
      if (!data.businesses || !Array.isArray(data.businesses)) {
        throw new Error('Invalid response from Yelp API');
      }

      // Fetch reviews for each business
      const places = await Promise.all(
        data.businesses.map(async (business) => {
          const reviewsUrl = `${this.baseUrl}/businesses/${business.id}/reviews`;
          const reviewsResponse = await fetch(reviewsUrl, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Accept': 'application/json',
            }
          });

          if (!reviewsResponse.ok) {
            return null;
          }

          const reviewsData = await reviewsResponse.json() as YelpReviewResponse;
          if (reviewsData.reviews && Array.isArray(reviewsData.reviews)) {
            return {
              place_id: business.id,
              name: business.name,
              address: `${business.location.address1 || ''}, ${business.location.city || ''}`,
              rating: business.rating,
              platform: 'yelp',
              reviews: reviewsData.reviews.map((review) => ({
                author_name: review.user.name || 'Anonymous',
                content: review.text,
                rating: review.rating,
                time: Math.floor(new Date(review.time_created).getTime() / 1000),
                platform: 'yelp',
                profile_url: review.user.profile_url,
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
      console.error("Error fetching from Yelp API:", error);
      throw new AppError(
        "API_ERROR",
        error instanceof Error ? error.message : "Failed to fetch from Yelp API"
      );
    }
  }
} 