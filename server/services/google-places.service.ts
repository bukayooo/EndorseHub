import { AppError } from "../lib/error";
import type { Review, SearchResult } from "./review-import.service";
import { apiKeysManager } from "../config/api-keys";

interface GooglePlacesSearchResponse {
  status: string;
  error_message?: string;
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    rating?: number;
  }>;
}

interface GooglePlacesDetailsResponse {
  status: string;
  result: {
    reviews?: Array<{
      author_name: string;
      text: string;
      rating: number;
      time: number;
      author_url?: string;
    }>;
  };
}

export class GooglePlacesService {
  private apiKey: string | null = null;
  private readonly baseUrl = "https://maps.googleapis.com/maps/api/place";

  constructor() {
    // API keys are already initialized at server startup
    const keys = apiKeysManager.getKeys();
    this.apiKey = keys.GOOGLE_PLACES_API_KEY;
    if (!this.apiKey) {
      throw new AppError("CONFIG_ERROR", "Google Places API key is not configured");
    }
  }

  public async searchBusinesses(query: string): Promise<SearchResult[]> {
    try {
      // First, search for places
      const searchUrl = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
      console.log('[Google Places] Searching places:', {
        url: searchUrl.replace(this.apiKey || '', '***') // Log URL without exposing API key
      });
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('[Google Places] API error details:', {
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          response: errorText,
          headers: Object.fromEntries(searchResponse.headers.entries())
        });
        throw new Error(`HTTP error! status: ${searchResponse.status} - ${errorText}`);
      }

      const data = await searchResponse.json() as GooglePlacesSearchResponse;
      if (data.status !== "OK") {
        console.error('[Google Places] API response error:', {
          status: data.status,
          error: data.error_message,
          query
        });
        throw new Error(`Google Places API error: ${data.error_message || data.status}`);
      }

      console.log('[Google Places] Found places:', {
        count: data.results.length,
        places: data.results.map(p => ({ id: p.place_id, name: p.name }))
      });

      // Fetch details for each place to get reviews
      const places = await Promise.all(
        data.results.slice(0, 5).map(async (place) => {
          const detailsUrl = `${this.baseUrl}/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,reviews&key=${this.apiKey}`;
          console.log('[Google Places] Fetching details for:', {
            placeId: place.place_id,
            name: place.name
          });
          
          const detailsResponse = await fetch(detailsUrl, {
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!detailsResponse.ok) {
            const errorText = await detailsResponse.text();
            console.error('[Google Places] Details API error:', {
              placeId: place.place_id,
              status: detailsResponse.status,
              response: errorText
            });
            return null;
          }

          const detailsData = await detailsResponse.json() as GooglePlacesDetailsResponse;
          if (detailsData.status === "OK") {
            const result = {
              place_id: place.place_id,
              name: place.name,
              address: place.formatted_address,
              rating: place.rating,
              platform: "google",
              reviews: (detailsData.result.reviews || []).map((review) => ({
                author_name: review.author_name,
                content: review.text,
                rating: review.rating,
                time: review.time,
                platform: "google",
                profile_url: review.author_url,
                review_url: `https://search.google.com/local/reviews?placeid=${place.place_id}`,
              })),
            } satisfies SearchResult;
            
            console.log('[Google Places] Got details:', {
              placeId: place.place_id,
              name: place.name,
              reviewCount: result.reviews.length
            });
            
            return result;
          }
          
          console.error('[Google Places] Details API response error:', {
            placeId: place.place_id,
            status: detailsData.status
          });
          return null;
        })
      );

      // Filter out null results and places without reviews
      const filteredPlaces = places
        .filter((place): place is NonNullable<typeof place> => place !== null)
        .filter(place => place.reviews.length > 0);
        
      console.log('[Google Places] Final results:', {
        totalPlaces: places.length,
        placesWithReviews: filteredPlaces.length
      });

      return filteredPlaces;
    } catch (error) {
      console.error("Error fetching from Google Places API:", error);
      throw new AppError(
        "API_ERROR",
        error instanceof Error ? error.message : "Failed to fetch from Google Places API"
      );
    }
  }
} 