import { pgTable, text, integer, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import type { InferModel } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  isPremium: boolean('isPremium').notNull().default(false),
  stripeCustomerId: text("stripeCustomerId"),
  createdAt: timestamp("createdAt").defaultNow(),
  marketingEmails: boolean("marketingEmails").default(true),
  keepMeLoggedIn: boolean("keepMeLoggedIn").default(false),
  username: text("username")
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  authorName: text("authorName").notNull(),
  content: text("content").notNull(),
  rating: integer("rating"),
  status: text("status", { enum: ['pending', 'approved', 'rejected'] }).default("pending"),
  userId: integer("userId").notNull(),
  source: text("source", { enum: ['direct', 'google', 'tripadvisor', 'facebook', 'yelp'] }).default("direct"),
  sourceMetadata: jsonb("sourceMetadata"),
  sourceUrl: text("sourceUrl"),
  platformId: text("platformId"),
  createdAt: timestamp("createdAt").defaultNow()
});

export const widgets = pgTable("widgets", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  template: text("template").notNull(),
  customization: jsonb("customization").notNull(),
  testimonialIds: integer("testimonialIds").array(),
  createdAt: timestamp("createdAt").defaultNow()
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  widgetId: integer("widgetId").notNull(),
  views: integer("views").default(0),
  clicks: integer("clicks").default(0),
  date: timestamp("date").defaultNow()
});

// Drizzle Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;

export type Widget = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTestimonialSchema = createInsertSchema(testimonials);
export const selectTestimonialSchema = createSelectSchema(testimonials);
export const insertWidgetSchema = createInsertSchema(widgets);
export const selectWidgetSchema = createSelectSchema(widgets);
export const insertAnalyticsSchema = createInsertSchema(analytics);
export const selectAnalyticsSchema = createSelectSchema(analytics);
