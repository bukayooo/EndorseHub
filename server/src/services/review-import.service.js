import { z } from 'zod';
export const reviewSchema = z.object({
    authorName: z.string().min(1, 'Author name is required'),
    content: z.string().min(1, 'Review content is required'),
    rating: z.number().min(1).max(5),
    time: z.number(),
    platform: z.enum(['google', 'yelp', 'tripadvisor']),
    profileUrl: z.string().url().optional(),
    profilePhotoUrl: z.string().url().optional(),
    reviewUrl: z.string().url().optional()
});
export const searchResultSchema = z.object({
    placeId: z.string(),
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
        }
        catch (error) {
            console.error('Platform search error:', error);
            return [];
        }
    }
    async searchBusinesses(query) {
        const [googleResults, yelpResults, tripAdvisorResults] = await Promise.all([
            this.searchPlatform(this.googlePlacesService, query),
            this.searchPlatform(this.yelpService, query),
            this.searchPlatform(this.tripAdvisorService, query)
        ]);
        const allResults = [
            ...googleResults,
            ...yelpResults,
            ...tripAdvisorResults
        ];
        // Sort by rating (descending) and number of reviews (descending)
        return allResults.sort((a, b) => {
            if (a.rating !== b.rating) {
                return b.rating - a.rating;
            }
            return b.reviews.length - a.reviews.length;
        });
    }
}
