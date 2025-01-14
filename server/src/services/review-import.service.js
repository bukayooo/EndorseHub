import { z } from 'zod';

export const reviewSchema = z.object({
    author_name: z.string().min(1, 'Author name is required'),
    content: z.string().min(1, 'Review content is required'),
    rating: z.number().min(1).max(5),
    time: z.number(),
    platform: z.enum(['google', 'yelp', 'tripadvisor']),
    profile_url: z.string().url().optional(),
    profile_photo_url: z.string().url().optional(),
    review_url: z.string().url().optional(),
    source_metadata: z.record(z.unknown()).optional(),
    source_url: z.string().url().optional(),
    platform_id: z.string().optional(),
    user_id: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional()
});

export const searchResultSchema = z.object({
    place_id: z.string(),
    name: z.string(),
    address: z.string(),
    rating: z.number(),
    platform: z.enum(['google', 'yelp', 'tripadvisor']),
    reviews: z.array(reviewSchema),
    url: z.string().url().optional()
});

export class ReviewImportService {
    constructor(googlePlacesService, yelpService, tripAdvisorService) {
        this.googlePlacesService = googlePlacesService;
        this.yelpService = yelpService;
        this.tripAdvisorService = tripAdvisorService;
    }

    validateReview(review) {
        return reviewSchema.parse(review);
    }

    async searchPlatform(service, query) {
        try {
            const results = await service.searchBusinesses(query);
            return results.map(result => searchResultSchema.parse(result));
        } catch (error) {
            console.error('Platform search error:', error);
            return [];
        }
    }

    async searchBusinesses(query) {
        const results = await Promise.allSettled([
            this.searchPlatform(this.googlePlacesService, query),
            this.searchPlatform(this.yelpService, query),
            this.searchPlatform(this.tripAdvisorService, query)
        ]);

        const allResults = results
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value);

        // Sort by rating (descending) and number of reviews (descending)
        return allResults.sort((a, b) => {
            if (a.rating !== b.rating) {
                return b.rating - a.rating;
            }
            return b.reviews.length - a.reviews.length;
        });
    }
}
