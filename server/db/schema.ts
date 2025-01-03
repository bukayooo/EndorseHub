import { integer, jsonb, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  is_premium: boolean('is_premium').notNull().default(false),
  stripe_customer_id: text('stripe_customer_id'),
  created_at: timestamp('created_at').defaultNow(),
  marketing_emails: boolean('marketing_emails').default(true),
  keep_me_logged_in: boolean('keep_me_logged_in').default(false),
  username: text('username')
});

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull(),
  authorName: text('authorName').notNull(),
  content: text('content').notNull(),
  rating: integer('rating'),
  status: text('status').default('pending').notNull(),
  source: text('source').default('direct').notNull(),
  sourceMetadata: jsonb('sourceMetadata'),
  sourceUrl: text('sourceUrl'),
  platformId: text('platformId'),
  createdAt: timestamp('createdAt').defaultNow().notNull()
});

export const widgets = pgTable('widgets', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull(),
  name: text('name').notNull(),
  template: text('template').notNull(),
  customization: jsonb('customization').notNull(),
  testimonialIds: integer('testimonialIds').array(),
  createdAt: timestamp('createdAt').defaultNow().notNull()
});

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  widgetId: integer('widgetId').notNull(),
  views: integer('views').default(0).notNull(),
  clicks: integer('clicks').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull()
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
