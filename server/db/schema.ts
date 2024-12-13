import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  isPremium: boolean('isPremium').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  marketingEmails: boolean('marketingEmails'),
  keepMeLoggedIn: boolean('keepMeLoggedIn'),
  stripeCustomerId: text('stripeCustomerId')
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(6)
});
export const selectUserSchema = createSelectSchema(users);

export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const widgets = pgTable('widgets', {
  id: serial('id').primaryKey(),
  userId: serial('userId').references(() => users.id),
  name: text('name').notNull(),
  template: text('template').notNull().default('default'),
  customization: text('customization'),
  testimonialIds: text('testimonialIds').array(),
  createdAt: timestamp('createdAt').notNull().defaultNow()
});

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  user_id: serial('user_id').references(() => users.id),
  authorName: text('authorName').notNull(),
  content: text('content').notNull(),
  rating: serial('rating').notNull(),
  status: text('status').notNull().default('pending'),
  source: text('source').notNull().default('direct'),
  createdAt: timestamp('createdAt').notNull().defaultNow()
});

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  widgetId: serial('widgetId').references(() => widgets.id),
  views: serial('views').notNull().default(0),
  clicks: serial('clicks').notNull().default(0),
  date: timestamp('date').notNull().defaultNow()
});
