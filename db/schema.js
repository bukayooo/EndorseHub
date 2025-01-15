import { pgTable, text, integer, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").unique().notNull(),
    password: text("password").notNull(),
    username: text("username"),
    is_premium: boolean('is_premium').notNull().default(false),
    is_admin: boolean('is_admin').notNull().default(false),
    stripe_customer_id: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripeSubscriptionId"),
    premiumExpiresAt: timestamp("premiumExpiresAt"),
    created_at: timestamp("created_at").defaultNow(),
    marketing_emails: boolean("marketing_emails").default(true),
    keep_me_logged_in: boolean("keep_me_logged_in").default(false)
});
export const testimonials = pgTable("testimonials", {
    id: serial("id").primaryKey(),
    author_name: text("author_name").notNull(),
    content: text("content").notNull(),
    rating: integer("rating"),
    status: text("status", { enum: ['pending', 'approved', 'rejected'] }).default("pending"),
    user_id: integer("user_id").notNull(),
    source: text("source", { enum: ['direct', 'google', 'tripadvisor', 'facebook', 'yelp'] }).default("direct"),
    source_metadata: jsonb("source_metadata"),
    source_url: text("source_url"),
    platform_id: text("platform_id"),
    created_at: timestamp("created_at").defaultNow()
});
export const widgets = pgTable("widgets", {
    id: serial("id").primaryKey(),
    user_id: integer("user_id").notNull(),
    name: text("name").notNull(),
    template: text("template").notNull(),
    customization: jsonb("customization").notNull(),
    testimonial_ids: integer("testimonial_ids").array(),
    created_at: timestamp("created_at").defaultNow()
});
export const analytics = pgTable("analytics", {
    id: serial("id").primaryKey(),
    widget_id: integer("widget_id").notNull(),
    views: integer("views").default(0),
    clicks: integer("clicks").default(0),
    date: timestamp("date").defaultNow()
});
// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTestimonialSchema = createInsertSchema(testimonials);
export const selectTestimonialSchema = createSelectSchema(testimonials);
export const insertWidgetSchema = createInsertSchema(widgets);
export const selectWidgetSchema = createSelectSchema(widgets);
export const insertAnalyticsSchema = createInsertSchema(analytics);
export const selectAnalyticsSchema = createSelectSchema(analytics);
