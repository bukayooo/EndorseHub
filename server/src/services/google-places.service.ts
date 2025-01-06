import { config } from '../config/api-keys';
import { z } from 'zod';

const googlePlacesReviewSchema = z.object({
  author_name: z.string(),
  text: z.string(),
  rating: z.number().min(1).max(5),
  time: z.number(),
  author_url: z.string().optional(),
  profile_photo_url: z.string().optional()
});

const googlePlacesResultSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  formatted_address: z.string(),
  rating: z.number().optional(),
  reviews: z.array(googlePlacesReviewSchema).optional(),
  url: z.string().optional()
});

const googlePlacesResponseSchema = z.object({
  results: z.array(googlePlacesResultSchema)
});

export class GooglePlacesService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor() {
    this.apiKey = config.GOOGLE_PLACES_API_KEY;
    if (!this.apiKey) {
      throw new Error('Google Places API key is required');
    }
  }

  async searchBusinesses(query: string) {
    const searchUrl = new URL(`${this.baseUrl}/textsearch/json`);
    searchUrl.searchParams.append('query', query);
    searchUrl.searchParams.append('key', this.apiKey);

    let attempt = 0;
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
        const parsed = googlePlacesResponseSchema.parse(data);

        return parsed.results.map(place => ({
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address,
          rating: place.rating ?? 0,
          platform: 'google' as const,
          reviews: (place.reviews ?? []).map(review => ({
            authorName: review.author_name,
            content: review.text,
            rating: review.rating,
            time: review.time * 1000, // Convert to milliseconds
            platform: 'google' as const,
            profileUrl: review.author_url,
            profilePhotoUrl: review.profile_photo_url
          })),
          url: place.url
        }));
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          console.error('Google Places API error:', error);
          throw error;
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    return [];
  }
} 