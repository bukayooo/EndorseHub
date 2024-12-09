import type { Express, Request } from "express";
import { setupAuth } from "./auth";

import { and, sql } from "drizzle-orm";
// Extend Express Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    password: string;
    isPremium: boolean | null;
    stripeCustomerId: string | null;
    createdAt: Date | null;
    marketingEmails: boolean | null;
    keepMeLoggedIn: boolean | null;
    username: string | null;
  };
}
import { db } from "../db";
import { testimonials, users, widgets, analytics } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function registerRoutes(app: Express) {
  // Setup authentication routes and middleware
  setupAuth(app);
  // Testimonials
  app.get("/api/testimonials", async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        console.log('Unauthorized testimonial access attempt');
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log(`Fetching testimonials for user ID: ${userId}`);
      const results = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.userId, userId))
        .orderBy(testimonials.createdAt)
        .limit(10);
      console.log(`Found ${results.length} testimonials for user ${userId}`);
      res.json(results);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const statusCode = error instanceof Error && error.message.includes('42703') ? 400 : 500;
      res.status(statusCode).json({ 
        error: "Failed to fetch testimonials",
        details: errorMessage,
        code: statusCode === 400 ? 'INVALID_QUERY' : 'INTERNAL_ERROR'
      });
    }
  });
  app.delete("/api/testimonials/:id", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const testimonialId = parseInt(req.params.id);
      
      // Only allow deletion if the testimonial belongs to the user
      const [testimonial] = await db
        .select()
        .from(testimonials)
        .where(and(
          eq(testimonials.id, testimonialId),
          eq(testimonials.userId, req.user.id)
        ))
        .limit(1);

      if (!testimonial) {
        return res.status(404).json({ error: "Testimonial not found" });
      }

      await db.delete(testimonials)
        .where(and(
          eq(testimonials.id, testimonialId),
          eq(testimonials.userId, req.user.id)
        ));

      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({ error: "Failed to delete testimonial" });
    }
  });

  app.delete("/api/testimonials/all", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      await db.delete(testimonials);
      
      res.json({ message: "All testimonials deleted successfully" });
    } catch (error) {
      console.error('Error deleting testimonials:', error);
      res.status(500).json({ error: "Failed to delete testimonials" });
    }
  });


  app.post("/api/testimonials", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { authorName, content, rating } = req.body;
      
      // Validate required fields
      if (!authorName?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Author name and content are required" });
      }

      const testimonial = await db.insert(testimonials).values({
        authorName: authorName.trim(),
        content: content.trim(),
        rating: Math.min(Math.max(parseInt(rating) || 5, 1), 5), // Ensure rating is between 1 and 5
        userId: req.user.id, // Always use the authenticated user's ID
        status: 'pending',
        source: 'direct',
        createdAt: new Date(),
      }).returning();

      res.json(testimonial[0]);
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  });
  // Search for businesses
  app.post("/api/testimonials/search", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { query, platform = 'google' } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }

      let searchResults;

      let data;
      switch (platform) {
        case 'google':
          // Search for places using Google Places API
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
            {
              headers: {
                'Accept': 'application/json',
              }
            }
          );
          data = await response.json();
          
          if (data.status !== "OK") {
        throw new Error(`Google Places API error: ${data.error_message || data.status}`);
          }

          // Fetch details for each place to get reviews
          interface GooglePlace {
            place_id: string;
            name: string;
            formatted_address: string;
            rating: number;
          }
          
          const places = await Promise.all(
            data.results.slice(0, 5).map(async (place: GooglePlace) => {
              const detailsResponse = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,reviews&key=${process.env.GOOGLE_PLACES_API_KEY}`,
                {
                  headers: {
                    'Accept': 'application/json',
                  }
                }
              );

              const detailsData = await detailsResponse.json();
              
              if (detailsData.status === "OK") {
                return {
                  placeId: place.place_id,
                  name: place.name,
                  address: place.formatted_address,
                  rating: place.rating,
                  platform: 'google',
                  reviews: (detailsData.result.reviews || []).map((review: any) => ({
                    authorName: review.author_name,
                    content: review.text,
                    rating: review.rating,
                    time: review.time,
                    platform: 'google',
                    profileUrl: review.author_url,
                    reviewUrl: `https://search.google.com/local/reviews?placeid=${place.place_id}`,
                  })),
                };
              }
              return null;
            })
          );

          // Filter out null results and places without reviews
          searchResults = places.filter((place): place is NonNullable<typeof place> => 
            place !== null && place.reviews.length > 0
          );
          break;
        
        case 'tripadvisor':
          // Search for locations using TripAdvisor API
          const tripadvisorResponse = await fetch(
            `https://api.content.tripadvisor.com/api/v1/location/search?searchQuery=${encodeURIComponent(query)}&language=en`,
            {
              headers: {
                'Accept': 'application/json',
                'X-TripAdvisor-API-Key': process.env.TRIPADVISOR_API_KEY as string
              }
            }
          );
          
          const tripadvisorData = await tripadvisorResponse.json();
          
          if (!tripadvisorData.data || !Array.isArray(tripadvisorData.data)) {
            throw new Error('Invalid response from TripAdvisor API');
          }

          // Fetch reviews for each location
          const tripadvisorPlaces = await Promise.all(
            tripadvisorData.data.slice(0, 5).map(async (location: any) => {
              const reviewsResponse = await fetch(
                `https://api.content.tripadvisor.com/api/v1/location/${location.location_id}/reviews?language=en`,
                {
                  headers: {
                    'Accept': 'application/json',
                    'X-TripAdvisor-API-Key': process.env.TRIPADVISOR_API_KEY as string
                  }
                }
              );

              const reviewsData = await reviewsResponse.json();
              
              if (reviewsData.data && Array.isArray(reviewsData.data)) {
                return {
                  placeId: location.location_id,
                  name: location.name,
                  address: location.address_obj ? `${location.address_obj.street1}, ${location.address_obj.city}` : '',
                  rating: location.rating,
                  platform: 'tripadvisor',
                  reviews: reviewsData.data.map((review: any) => ({
                    authorName: review.user.username,
                    content: review.text,
                    rating: review.rating,
                    time: Math.floor(new Date(review.published_date).getTime() / 1000),
                    platform: 'tripadvisor',
                    profileUrl: review.user.userProfile,
                    reviewUrl: review.url
                  })),
                };
              }
              return null;
            })
          );

          // Filter out null results and places without reviews
          searchResults = tripadvisorPlaces.filter((place): place is NonNullable<typeof place> => 
            place !== null && place.reviews.length > 0
          );
          break;
        
        case 'facebook':
          // Implement Facebook API integration
          return res.status(501).json({ error: "Facebook integration coming soon" });
        
        case 'yelp':
          // Search for businesses using Yelp API
          const yelpResponse = await fetch(
            `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(query)}&limit=5`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.YELP_API_KEY}`,
                'Accept': 'application/json',
              }
            }
          );
          
          if (!yelpResponse.ok) {
            throw new Error(`Yelp API error: ${yelpResponse.statusText}`);
          }

          const yelpData = await yelpResponse.json();
          
          if (!yelpData.businesses || !Array.isArray(yelpData.businesses)) {
            throw new Error('Invalid response from Yelp API');
          }

          // Fetch reviews for each business
          const yelpPlaces = await Promise.all(
            yelpData.businesses.map(async (business: any) => {
              const reviewsResponse = await fetch(
                `https://api.yelp.com/v3/businesses/${business.id}/reviews`,
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.YELP_API_KEY}`,
                    'Accept': 'application/json',
                  }
                }
              );

              if (!reviewsResponse.ok) {
                return null;
              }

              const reviewsData = await reviewsResponse.json();
              
              if (reviewsData.reviews && Array.isArray(reviewsData.reviews)) {
                return {
                  placeId: business.id,
                  name: business.name,
                  address: `${business.location.address1}, ${business.location.city}`,
                  rating: business.rating,
                  platform: 'yelp',
                  reviews: reviewsData.reviews.map((review: any) => ({
                    authorName: review.user.name || 'Anonymous',
                    content: review.text,
                    rating: review.rating,
                    time: Math.floor(new Date(review.time_created).getTime() / 1000),
                    platform: 'yelp',
                    profileUrl: review.user.profile_url,
                    reviewUrl: review.url
                  })),
                };
              }
              return null;
            })
          );

          // Filter out null results and places without reviews
          searchResults = yelpPlaces.filter((place): place is NonNullable<typeof place> => 
            place !== null && place.reviews.length > 0
          );
          break;
        
        default:
          return res.status(400).json({ error: "Unsupported platform" });
      }

      res.json(searchResults);

      // Results have already been filtered and set to searchResults
      // in each platform's case block
    } catch (error) {
      console.error('Error searching places:', error);
      res.status(500).json({
        error: "Failed to search for businesses",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Import a specific review
  app.post("/api/testimonials/import", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { placeId, review } = req.body;
      
      if (!placeId || !review) {
        return res.status(400).json({ error: "Place ID and review data are required" });
      }

      // Validate review data
      if (!review.authorName || !review.content || !review.rating) {
        return res.status(400).json({ error: "Invalid review data" });
      }

      const importedReview = await db.insert(testimonials).values({
        authorName: review.authorName,
        content: review.content,
        rating: review.rating,
        userId: req.user.id,
        source: review.platform || 'google',
        platformId: placeId,
        sourceMetadata: {
          profileUrl: review.profileUrl,
          reviewUrl: review.reviewUrl,
          platform: review.platform || 'google',
          importedAt: new Date().toISOString(),
        },
        status: "pending",
        createdAt: new Date(review.time * 1000)
      }).returning();

      res.json(importedReview[0]);
    } catch (error) {
      console.error('Error importing review:', error);
      res.status(500).json({
        error: "Failed to import review",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });


  // Widgets
  app.get("/api/widgets", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const results = await db.query.widgets.findMany({
        where: eq(widgets.userId, req.user.id),
        orderBy: (widgets, { desc }) => [desc(widgets.createdAt)]
      });
      
      res.json(results);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  app.get("/api/widgets/:id", async (req: AuthenticatedRequest, res) => {
    try {
      // Set JSON content type
      res.setHeader('Content-Type', 'application/json');

      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const widgetId = parseInt(req.params.id);
      if (isNaN(widgetId)) {
        return res.status(400).json({ error: "Invalid widget ID" });
      }

      const widget = await db.query.widgets.findFirst({
        where: eq(widgets.id, widgetId)
      });

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Only return widget if it belongs to the authenticated user
      if (widget.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(widget);
    } catch (error) {
      console.error('Error fetching widget:', error);
      res.status(500).json({ error: "Failed to fetch widget" });
    }
  });

  app.post("/api/widgets", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { testimonialIds, ...widgetData } = req.body;
      
      // Ensure testimonialIds is an array and convert to numbers
      const validatedTestimonialIds = Array.isArray(testimonialIds) 
        ? testimonialIds.map(id => Number(id)).filter(id => !isNaN(id))
        : [];
      
      const widget = await db.insert(widgets).values({
        ...widgetData,
        testimonial_ids: validatedTestimonialIds,
        userId: req.user.id,
      }).returning();

      console.log('Created widget with testimonialIds:', validatedTestimonialIds);
      res.json(widget[0]);
    } catch (error) {
      console.error('Error creating widget:', error);
      res.status(500).json({ 
        error: "Failed to create widget",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.delete("/api/widgets/:id", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const widgetId = parseInt(req.params.id);
      const [widget] = await db
        .select()
        .from(widgets)
        .where(and(
          eq(widgets.id, widgetId),
          eq(widgets.userId, req.user.id)
        ))
        .limit(1);

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      await db.delete(widgets)
        .where(and(
          eq(widgets.id, widgetId),
          eq(widgets.userId, req.user.id)
        ));

      res.json({ message: "Widget deleted successfully" });
    } catch (error) {
      console.error('Error deleting widget:', error);
      res.status(500).json({ error: "Failed to delete widget" });
    }
  });


  // Analytics
  app.get("/api/stats", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get counts using direct queries
      const [[testimonialResult], [widgetResult]] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*)::int as count
          FROM ${testimonials}
          WHERE ${testimonials.userId} = ${req.user.id}
        `),
        db.execute(sql`
          SELECT COUNT(*)::int as count
          FROM ${widgets}
          WHERE ${widgets.userId} = ${req.user.id}
        `)
      ]);

      // Extract counts from results
      const testimonialCount = testimonialResult?.count || 0;
      const widgetCount = widgetResult?.count || 0;

      res.json({
        testimonialCount,
        widgetCount,
        viewCount: 0, // TODO: Implement real analytics
        conversionRate: "0%",
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Widget Embed
  app.get("/embed/:widgetId", async (req, res) => {
    try {
      // Add CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('X-Frame-Options', 'ALLOWALL');
      
      const widgetId = parseInt(req.params.widgetId);
      if (isNaN(widgetId)) {
        return res.status(400).json({ error: "Invalid widget ID" });
      }

      const widget = await db.query.widgets.findFirst({
        where: eq(widgets.id, widgetId)
      });

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Fetch only selected testimonials for the widget
      // Fetch only the selected testimonials if testimonialIds exists
      const testimonialQuery = Array.isArray(widget.testimonialIds) && widget.testimonialIds.length > 0
        ? await db.query.testimonials.findMany({
            where: and(
              eq(testimonials.userId, widget.userId),
              sql`${testimonials.id} = ANY(${widget.testimonialIds})`
            ),
            orderBy: (testimonials, { desc }) => [desc(testimonials.createdAt)],
          })
        : await db.query.testimonials.findMany({
            where: eq(testimonials.userId, widget.userId),
            orderBy: (testimonials, { desc }) => [desc(testimonials.createdAt)],
          });

      const filteredTestimonials = testimonialQuery;

      // Update analytics
      await db.insert(analytics).values({
        widgetId: widget.id,
        views: 1,
      });

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Minimal reset styles */
            body { margin: 0; padding: 0; }
            * { box-sizing: border-box; }
            
            /* Theme styles */
            ${(() => {
              interface WidgetCustomization {
                theme?: 'default' | 'light' | 'dark' | 'brand';
                brandColor?: string;
                showRatings?: boolean;
                showImages?: boolean;
              }
              const customization = widget.customization as WidgetCustomization | null;
              return customization?.theme === 'brand' && customization?.brandColor ? `
              :root {
                --brand-color: ${customization.brandColor};
                --primary: var(--brand-color);
                --primary-foreground: #ffffff;
              }
              ` : '';
            })()}
          </style>
          <script>
            window.WIDGET_DATA = {
              testimonials: ${JSON.stringify(userTestimonials)},
              widgetId: ${widget.id},
              customization: ${JSON.stringify(widget.customization || {
                theme: 'default',
                showRatings: true,
                showImages: true
              })}
            };
          </script>
          <script src="/widget.js" defer></script>
        </head>
        <body>
          <div id="testimonial-widget" data-widget-id="${widget.id}">
            <!-- Widget content will be dynamically loaded -->
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error serving widget:', error);
      res.status(500).json({ error: "Failed to serve widget" });
    }
  });
}
