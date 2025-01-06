import { API_KEYS } from "../config/api-keys";
import { AppError } from "../lib/error";
import type { Review, SearchResult } from "./review-import.service";

interface YelpBusinessResponse {
  businesses: Array<{
    id: string;
    name: string;
    location: {
      address1: string;
      city: string;
      state: string;
      zip_code: string;
    };
    rating: number;
    url: string;
  }>;
}

interface YelpReviewsResponse {
  reviews: Array<{
    id: string;
    user: {
      name: string;
      profile_url: string;
    };
    text: string;
    rating: number;
    time_created: string;
    url: string;
  }>;
}

export class YelpService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.yelp.com/v3";

  constructor() {
    if (!API_KEYS.YELP_API_KEY) {
      throw new AppError("CONFIG_ERROR", "Yelp API key is not configured");
    }
    this.apiKey = API_KEYS.YELP_API_KEY;
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
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
      // First, search for businesses
      const searchUrl = `${this.baseUrl}/businesses/search?term=${encodeURIComponent(
        query
      )}&limit=5`;

      const searchResponse = await this.fetchWithRetry(searchUrl);
      const searchData = (await searchResponse.json()) as YelpBusinessResponse;

      // Then, get reviews for each business
      const results = await Promise.all(
        searchData.businesses.map(async business => {
          const reviewsUrl = `${this.baseUrl}/businesses/${business.id}/reviews`;

          const reviewsResponse = await this.fetchWithRetry(reviewsUrl);
          const reviewsData = (await reviewsResponse.json()) as YelpReviewsResponse;

          const reviews: Review[] = reviewsData.reviews.map(review => ({
            authorName: review.user.name,
            content: review.text,
            rating: review.rating,
            time: new Date(review.time_created).getTime() / 1000,
            platform: "yelp",
            profileUrl: review.user.profile_url,
            reviewUrl: review.url,
          }));

          return {
            placeId: business.id,
            name: business.name,
            address: [
              business.location.address1,
              business.location.city,
              business.location.state,
              business.location.zip_code,
            ]
              .filter(Boolean)
              .join(", "),
            rating: business.rating,
            platform: "yelp",
            reviews,
            url: business.url,
          };
        })
      );

      return results;
    } catch (error) {
      console.error("Error fetching from Yelp API:", error);
      throw new AppError(
        "API_ERROR",
        error instanceof Error ? error.message : "Failed to fetch from Yelp API"
      );
    }
  }
} 