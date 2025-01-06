import { config } from '../config/api-keys';
import { z } from 'zod';

const yelpUserSchema = z.object({
  name: z.string(),
  profile_url: z.string().optional(),
  image_url: z.string().optional()
});

const yelpReviewSchema = z.object({
  user: yelpUserSchema,
  text: z.string(),
  rating: z.number().min(1).max(5),
  time_created: z.string(),
  url: z.string().optional()
});

const yelpBusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.object({
    address1: z.string(),
    city: z.string(),
    state: z.string(),
    zip_code: z.string()
  }),
  rating: z.number().optional(),
  url: z.string().optional()
});

const yelpSearchResponseSchema = z.object({
  businesses: z.array(yelpBusinessSchema)
});

const yelpReviewsResponseSchema = z.object({
  reviews: z.array(yelpReviewSchema)
});

export class YelpService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.yelp.com/v3';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor() {
    this.apiKey = config.YELP_API_KEY;
    if (!this.apiKey) {
      throw new Error('Yelp API key is required');
    }
  }

  private async fetchWithRetry(url: string) {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
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
          throw new Error(`Yelp API error: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          console.error('Yelp API error:', error);
          throw error;
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async getBusinessReviews(businessId: string) {
    try {
      const data = await this.fetchWithRetry(
        `${this.baseUrl}/businesses/${businessId}/reviews`
      );
      const parsed = yelpReviewsResponseSchema.parse(data);
      return parsed.reviews;
    } catch (error) {
      console.error(`Error fetching reviews for business ${businessId}:`, error);
      return [];
    }
  }

  async searchBusinesses(query: string) {
    const searchUrl = new URL(`${this.baseUrl}/businesses/search`);
    searchUrl.searchParams.append('term', query);
    searchUrl.searchParams.append('limit', '5');

    try {
      const data = await this.fetchWithRetry(searchUrl.toString());
      const parsed = yelpSearchResponseSchema.parse(data);

      const businesses = await Promise.all(
        parsed.businesses.map(async business => {
          const reviews = await this.getBusinessReviews(business.id);
          const { location } = business;
          
          return {
            placeId: business.id,
            name: business.name,
            address: [
              location.address1,
              location.city,
              location.state,
              location.zip_code
            ].filter(Boolean).join(', '),
            rating: business.rating ?? 0,
            platform: 'yelp' as const,
            reviews: reviews.map(review => ({
              authorName: review.user.name,
              content: review.text,
              rating: review.rating,
              time: new Date(review.time_created).getTime(),
              platform: 'yelp' as const,
              profileUrl: review.user.profile_url,
              profilePhotoUrl: review.user.image_url,
              reviewUrl: review.url
            })),
            url: business.url
          };
        })
      );

      return businesses;
    } catch (error) {
      console.error('Error searching Yelp businesses:', error);
      throw error;
    }
  }
} 