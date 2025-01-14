import { config } from '../config/api-keys';
import { z } from 'zod';
const tripAdvisorUserSchema = z.object({
    username: z.string(),
    user_id: z.string(),
    avatar: z.object({
        small: z.object({
            url: z.string()
        }).optional()
    }).optional()
});
const tripAdvisorReviewSchema = z.object({
    user: tripAdvisorUserSchema,
    text: z.string(),
    rating: z.number().min(1).max(5),
    published_date: z.string(),
    url: z.string().optional()
});
const tripAdvisorAddressSchema = z.object({
    street1: z.string(),
    city: z.string(),
    state: z.string().optional(),
    postalcode: z.string().optional(),
    country: z.string().optional()
});
const tripAdvisorLocationSchema = z.object({
    location_id: z.string(),
    name: z.string(),
    address_obj: tripAdvisorAddressSchema,
    rating: z.number().optional(),
    web_url: z.string().optional()
});
const tripAdvisorSearchResponseSchema = z.object({
    data: z.array(tripAdvisorLocationSchema)
});
const tripAdvisorReviewsResponseSchema = z.object({
    data: z.array(tripAdvisorReviewSchema)
});
export class TripAdvisorService {
    constructor() {
        this.baseUrl = 'https://api.content.tripadvisor.com/api/v1';
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.apiKey = config.TRIPADVISOR_API_KEY;
        if (!this.apiKey) {
            throw new Error('TripAdvisor API key is required');
        }
    }
    async fetchWithRetry(url) {
        let attempt = 0;
        while (attempt < this.maxRetries) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'X-TripAdvisor-API-Key': this.apiKey,
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
                    throw new Error(`TripAdvisor API error: ${response.statusText}`);
                }
                return await response.json();
            }
            catch (error) {
                if (attempt === this.maxRetries - 1) {
                    console.error('TripAdvisor API error:', error);
                    throw error;
                }
                attempt++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
        throw new Error('Max retries exceeded');
    }
    async getLocationReviews(locationId) {
        try {
            const data = await this.fetchWithRetry(`${this.baseUrl}/location/${locationId}/reviews`);
            const parsed = tripAdvisorReviewsResponseSchema.parse(data);
            return parsed.data;
        }
        catch (error) {
            console.error(`Error fetching reviews for location ${locationId}:`, error);
            return [];
        }
    }
    formatAddress(addressObj) {
        return [
            addressObj.street1,
            addressObj.city,
            addressObj.state,
            addressObj.postalcode,
            addressObj.country
        ].filter(Boolean).join(', ');
    }
    async searchBusinesses(query) {
        const searchUrl = new URL(`${this.baseUrl}/location/search`);
        searchUrl.searchParams.append('searchQuery', query);
        searchUrl.searchParams.append('language', 'en');
        try {
            const data = await this.fetchWithRetry(searchUrl.toString());
            const parsed = tripAdvisorSearchResponseSchema.parse(data);
            const locations = await Promise.all(parsed.data.map(async (location) => {
                const reviews = await this.getLocationReviews(location.location_id);
                return {
                    placeId: location.location_id,
                    name: location.name,
                    address: this.formatAddress(location.address_obj),
                    rating: location.rating ?? 0,
                    platform: 'tripadvisor',
                    reviews: reviews.map(review => ({
                        authorName: review.user.username,
                        content: review.text,
                        rating: review.rating,
                        time: new Date(review.published_date).getTime(),
                        platform: 'tripadvisor',
                        profileUrl: this.generateProfileUrl(review.user),
                        profilePhotoUrl: review.user.avatar?.small?.url,
                        reviewUrl: review.url
                    })),
                    url: location.web_url
                };
            }));
            return locations;
        }
        catch (error) {
            console.error('Error searching TripAdvisor locations:', error);
            throw error;
        }
    }
    generateProfileUrl(user) {
        if (!user?.user_id || typeof user.user_id !== 'string' || user.user_id.trim() === '') {
            return undefined;
        }
        const sanitizedUserId = encodeURIComponent(user.user_id.trim());
        return `https://www.tripadvisor.com/Profile/${sanitizedUserId}`;
    }
}
