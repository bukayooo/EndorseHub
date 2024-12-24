import { pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  isPremium: boolean('isPremium').notNull().default(false),
  stripeCustomerId: text("stripeCustomerId"),
  createdAt: timestamp("createdAt").defaultNow(),
  marketingEmails: boolean("marketingEmails").default(true),
  keepMeLoggedIn: boolean("keepMeLoggedIn").default(false),
  username: text("username"),  // Made optional
});

export const testimonials = pgTable("testimonials", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  authorName: text("authorName").notNull(),
  content: text("content").notNull(),
  rating: integer("rating"),
  status: text("status").default("pending"), // pending, approved, rejected
  userId: integer("userId").notNull(),
  source: text("source").default("direct"), // direct, google, tripadvisor, facebook, yelp
  sourceMetadata: jsonb("sourceMetadata"), // Store platform-specific metadata
  sourceUrl: text("sourceUrl"),
  platformId: text("platformId"), // External ID from the review platform
  createdAt: timestamp("createdAt").defaultNow(),
});

export const widgets = pgTable("widgets", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  template: text("template").notNull(),
  customization: jsonb("customization").notNull(),
  testimonialIds: integer("testimonialIds").array(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const analytics = pgTable("analytics", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  widgetId: integer("widgetId").notNull(),
  views: integer("views").default(0),
  clicks: integer("clicks").default(0),
  date: timestamp("date").defaultNow(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTestimonialSchema = createInsertSchema(testimonials);
export const selectTestimonialSchema = createSelectSchema(testimonials);
export const insertWidgetSchema = createInsertSchema(widgets);
export const selectWidgetSchema = createSelectSchema(widgets);

// Types
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Testimonial = z.infer<typeof selectTestimonialSchema>;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Widget = z.infer<typeof selectWidgetSchema>;
export type InsertWidget = z.infer<typeof insertWidgetSchema>;
