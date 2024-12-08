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
  // Import reviews
  app.post("/api/testimonials/import", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { url, platform } = req.body;
      
      if (!url || !platform) {
        return res.status(400).json({ error: "URL and platform are required" });
      }

      // Function to follow URL redirects and get final URL
      const getRedirectedUrl = async (url: string): Promise<string> => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; TestimonialHub/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
              'Accept-Language': 'en-US,en;q=0.5'
            }
          });
          
          // If response is not ok, throw an error
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // Get the final URL after all redirects
          const finalUrl = response.url;
          console.log('Redirected to:', finalUrl);
          return finalUrl;
        } catch (error) {
          console.error('Error following redirect:', error);
          throw new Error('Failed to follow URL redirect');
        }
      };

      // Function to extract business ID from URL
      const extractBusinessId = async (url: string, platform: string) => {
        try {
          if (platform === "google") {
            // Handle Google shortened URLs (g.co/kgs format)
            if (url.includes("g.co/kgs")) {
              console.log('Handling shortened Google URL:', url);
              const finalUrl = await getRedirectedUrl(url);
              console.log('Final URL after redirect:', finalUrl);
              
              // Parse the final URL
              const finalUrlObj = new URL(finalUrl);
              
              // Try different ways to extract the place ID
              let placeId = null;
              
              // Check URL parameters
              placeId = finalUrlObj.searchParams.get("cid") || // Content ID
                       finalUrlObj.searchParams.get("place_id") || // Place ID
                       finalUrlObj.searchParams.get("pid"); // Alternative ID
              
              // If not found in parameters, try extracting from pathname
              if (!placeId && finalUrlObj.pathname.includes("/place/")) {
                const pathSegments = finalUrlObj.pathname.split("/place/")[1]?.split("/");
                if (pathSegments && pathSegments.length > 0) {
                  placeId = pathSegments[0];
                }
              }
              
              if (placeId) {
                console.log('Successfully extracted place ID:', placeId);
                return placeId;
              }
              
              throw new Error('Could not extract place ID from Google Maps URL');
            }
            
            // Handle regular Google Maps URLs
            const urlObj = new URL(url);
            return urlObj.searchParams.get("cid") ||
                   urlObj.searchParams.get("place_id") ||
                   urlObj.searchParams.get("pid") ||
                   urlObj.pathname.split("/place/")[1]?.split("/")[0] ||
                   null;
          } else if (platform === "yelp") {
            // Example Yelp URL: https://www.yelp.com/biz/business-name-location
            const urlObj = new URL(url);
            const businessId = urlObj.pathname.split("/biz/")[1]?.split("?")[0];
            if (!businessId) {
              throw new Error('Could not extract business ID from Yelp URL');
            }
            return businessId;
          }
          
          return null;
        } catch (error) {
          console.error('Error extracting business ID:', error);
          throw error;
        }
      };

      try {
        const businessId = await extractBusinessId(url, platform);
        if (!businessId) {
          return res.status(400).json({ 
            error: `Invalid ${platform} review URL. Please make sure you're using a valid URL from the ${platform} share button.`,
            details: "Could not extract business ID from the provided URL"
          });
        }

        // Here we would normally make API calls to Yelp/Google
        // For now, we'll add a sample review to demonstrate the functionality
        const sampleReview = {
          authorName: `${platform} Reviewer`,
          content: `This is a sample imported review from ${platform}`,
          rating: 5,
          userId: req.user.id,
          source: platform,
          sourceUrl: url,
          platformId: businessId,
          status: "pending",
          createdAt: new Date(),
        };

        const importedReview = await db.insert(testimonials).values(sampleReview).returning();

        res.json(importedReview[0]);
      } catch (error) {
        console.error('Error importing reviews:', error);
        if (error instanceof Error) {
          res.status(400).json({ 
            error: "Failed to import reviews",
            details: error.message
          });
        } else {
          res.status(500).json({ error: "An unexpected error occurred while importing reviews" });
        }
      }
    } catch (error) {
      console.error('Error in import endpoint:', error);
      res.status(500).json({ error: "Failed to process import request" });
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
