import { API_KEYS } from "../config/api-keys";
import { AppError } from "../lib/error";
import type { Review, SearchResult } from "./review-import.service";

interface TripAdvisorLocationResponse {
  data: Array<{
    location_id: string;
    name: string;
    address_obj: {
      street1: string;
      city: string;
      state: string;
      postalcode: string;
    };
    rating: number;
    web_url: string;
  }>;
}

interface TripAdvisorReviewsResponse {
  data: Array<{
    user: {
      username: string;
      user_profile_url: string;
    };
    text: string;
    rating: number;
    published_date: string;
    web_url: string;
  }>;
}

export class TripAdvisorService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.tripadvisor.com/data/v1";

  constructor() {
    if (!API_KEYS.TRIPADVISOR_API_KEY) {
      throw new AppError("CONFIG_ERROR", "TripAdvisor API key is not configured");
    }
    this.apiKey = API_KEYS.TRIPADVISOR_API_KEY;
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            "X-TripAdvisor-API-Key": this.apiKey,
          },
        });
        if (response.ok) {
          return response;
        }
        if (response.status === 429) {
          // Rate limit hit, wait before retrying
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error("Max retries reached");
  }

  public async searchBusinesses(query: string): Promise<SearchResult[]> {
    try {
      // First, search for locations
      const searchUrl = `${this.baseUrl}/location/search?searchQuery=${encodeURIComponent(
        query
      )}&limit=5`;

      const searchResponse = await this.fetchWithRetry(searchUrl);
      const searchData = (await searchResponse.json()) as TripAdvisorLocationResponse;

      // Then, get reviews for each location
      const results = await Promise.all(
        searchData.data.map(async location => {
          const reviewsUrl = `${this.baseUrl}/location/${location.location_id}/reviews?limit=5`;

          const reviewsResponse = await this.fetchWithRetry(reviewsUrl);
          const reviewsData = (await reviewsResponse.json()) as TripAdvisorReviewsResponse;

          const reviews: Review[] = reviewsData.data.map(review => ({
            authorName: review.user.username,
            content: review.text,
            rating: review.rating,
            time: new Date(review.published_date).getTime() / 1000,
            platform: "tripadvisor",
            profileUrl: review.user.user_profile_url,
            reviewUrl: review.web_url,
          }));

          return {
            placeId: location.location_id,
            name: location.name,
            address: [
              location.address_obj.street1,
              location.address_obj.city,
              location.address_obj.state,
              location.address_obj.postalcode,
            ]
              .filter(Boolean)
              .join(", "),
            rating: location.rating,
            platform: "tripadvisor",
            reviews,
            url: location.web_url,
          };
        })
      );

      return results;
    } catch (error) {
      console.error("Error fetching from TripAdvisor API:", error);
      throw new AppError(
        "API_ERROR",
        error instanceof Error ? error.message : "Failed to fetch from TripAdvisor API"
      );
    }
  }
} 