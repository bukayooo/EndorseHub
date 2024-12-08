import type { Express, Request } from "express";
import { setupAuth } from "./auth";

import { and } from "drizzle-orm";
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
          const places = await Promise.all(
            data.results.slice(0, 5).map(async (place) => {
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
          // Implement TripAdvisor API integration
          return res.status(501).json({ error: "TripAdvisor integration coming soon" });
        
        case 'facebook':
          // Implement Facebook API integration
          return res.status(501).json({ error: "Facebook integration coming soon" });
        
        case 'yelp':
          // Implement Yelp API integration
          return res.status(501).json({ error: "Yelp integration coming soon" });
        
        default:
          return res.status(400).json({ error: "Unsupported platform" });
      }

      res.json(searchResults);

      // Filter out null results and places without reviews
      const validPlaces = places.filter((place): place is NonNullable<typeof place> => 
        place !== null && place.reviews.length > 0
      );

      res.json(validPlaces);
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
      const results = await db.query.widgets.findMany({
        where: eq(widgets.userId, req.user?.id || 1), // TODO: Proper auth
      });
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  app.post("/api/widgets", async (req: AuthenticatedRequest, res) => {
    try {
      const widget = await db.insert(widgets).values({
        ...req.body,
        userId: req.user?.id || 1, // TODO: Proper auth
      }).returning();
      res.json(widget[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create widget" });
    }
  });

  // Analytics
  app.get("/api/stats", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const [testimonialCount, widgetCount] = await Promise.all([
        db.query.testimonials.findMany({
          where: eq(testimonials.userId, req.user.id)
        }).then(r => r.length),
        db.query.widgets.findMany({
          where: eq(widgets.userId, req.user.id)
        }).then(r => r.length),
      ]);

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
      const widget = await db.query.widgets.findFirst({
        where: eq(widgets.id, parseInt(req.params.widgetId)),
        with: {
          user: true
        }
      });

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Fetch testimonials only for the widget owner
      const userTestimonials = await db.query.testimonials.findMany({
        where: eq(testimonials.userId, widget.userId),
        orderBy: (testimonials, { desc }) => [desc(testimonials.createdAt)],
      });

      // Update analytics
      await db.insert(analytics).values({
        widgetId: widget.id,
        views: 1,
      });

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* Minimal styles for the embedded widget */
            body { margin: 0; font-family: system-ui, sans-serif; }
          </style>
          <script>
            window.WIDGET_DATA = {
              testimonials: ${JSON.stringify(userTestimonials)},
              widgetId: ${widget.id}
            };
          </script>
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
