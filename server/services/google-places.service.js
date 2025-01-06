import { API_KEYS } from "../config/api-keys";
import { AppError } from "../lib/error";
export class GooglePlacesService {
    constructor() {
        this.baseUrl = "https://maps.googleapis.com/maps/api/place";
        if (!API_KEYS.GOOGLE_PLACES_API_KEY) {
            throw new AppError("CONFIG_ERROR", "Google Places API key is not configured");
        }
        this.apiKey = API_KEYS.GOOGLE_PLACES_API_KEY;
    }
    async fetchWithRetry(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return response;
                }
                if (response.status === 429) {
                    // Rate limit hit, wait before retrying
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                    continue;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            catch (error) {
                if (i === retries - 1)
                    throw error;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
        throw new Error("Max retries reached");
    }
    async searchBusinesses(query) {
        try {
            // First, search for places
            const searchUrl = `${this.baseUrl}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,rating&key=${this.apiKey}`;
            const searchResponse = await this.fetchWithRetry(searchUrl);
            const searchData = (await searchResponse.json());
            // Then, get details for each place (including reviews)
            const results = await Promise.all(searchData.candidates.map(async (place) => {
                const detailsUrl = `${this.baseUrl}/details/json?place_id=${place.place_id}&fields=reviews,url&key=${this.apiKey}`;
                const detailsResponse = await this.fetchWithRetry(detailsUrl);
                const detailsData = (await detailsResponse.json());
                const reviews = detailsData.result.reviews?.map(review => ({
                    authorName: review.author_name,
                    content: review.text,
                    rating: review.rating,
                    time: review.time,
                    platform: "google",
                    profileUrl: review.author_url,
                    reviewUrl: detailsData.result.url,
                })) || [];
                return {
                    placeId: place.place_id,
                    name: place.name,
                    address: place.formatted_address,
                    rating: place.rating,
                    platform: "google",
                    reviews,
                    url: detailsData.result.url,
                };
            }));
            return results;
        }
        catch (error) {
            console.error("Error fetching from Google Places API:", error);
            throw new AppError("API_ERROR", error instanceof Error ? error.message : "Failed to fetch from Google Places API");
        }
    }
}
