import { API_KEYS } from "../config/api-keys";
import { AppError } from "../lib/error";

export class GooglePlacesService {
    constructor() {
        this.baseUrl = "https://maps.googleapis.com/maps/api/place";
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        if (!API_KEYS.GOOGLE_PLACES_API_KEY) {
            throw new AppError("CONFIG_ERROR", "Google Places API key is not configured");
        }
        this.apiKey = API_KEYS.GOOGLE_PLACES_API_KEY;
    }

    async searchBusinesses(query) {
        let attempt = 0;
        const searchUrl = new URL(`${this.baseUrl}/textsearch/json`);
        searchUrl.searchParams.append('query', query);
        searchUrl.searchParams.append('key', this.apiKey);

        while (attempt < this.maxRetries) {
            try {
                const response = await fetch(searchUrl.toString(), {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        // Rate limit hit, wait and retry
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                        attempt++;
                        continue;
                    }
                    throw new Error(`Google Places API error: ${response.statusText}`);
                }

                const data = await response.json();
                
                return data.results.map(place => ({
                    placeId: place.place_id,
                    name: place.name,
                    address: place.formatted_address,
                    rating: place.rating ?? 0,
                    platform: "google",
                    reviews: (place.reviews ?? []).map(review => ({
                        authorName: review.author_name,
                        content: review.text,
                        rating: review.rating,
                        time: review.time * 1000, // Convert to milliseconds
                        platform: "google",
                        profileUrl: review.author_url,
                        profilePhotoUrl: review.profile_photo_url
                    })),
                    url: place.url
                }));
            } catch (error) {
                if (attempt === this.maxRetries - 1) {
                    console.error('Google Places API error:', error);
                    throw new AppError("API_ERROR", error instanceof Error ? error.message : "Failed to fetch from Google Places API");
                }
                attempt++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }

        return [];
    }
}
