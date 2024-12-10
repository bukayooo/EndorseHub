import { z } from "zod";

// Shared types between client and server
export type Testimonial = {
  id: number;
  authorName: string;
  content: string;
  rating?: number;
  status: string;
  userId: number;
  source: string;
  sourceMetadata?: any;
  sourceUrl?: string;
  platformId?: string;
  createdAt?: string;
};

export type User = {
  id: number;
  email: string;
  isPremium: boolean;
  stripeCustomerId?: string;
  createdAt?: string;
  marketingEmails: boolean;
  keepMeLoggedIn: boolean;
  username?: string;
};

export type Widget = {
  id: number;
  userId: number;
  name: string;
  template: string;
  customization: any;
  testimonialIds?: number[];
  createdAt?: string;
};

// Type-only exports
export type { 
  Testimonial as TestimonialType,
  User as UserType,
  Widget as WidgetType
};

// Re-export zod schemas
export const testimonialSchema = z.object({
  id: z.number(),
  authorName: z.string(),
  content: z.string(),
  rating: z.number().optional(),
  status: z.string().default("pending"),
  userId: z.number(),
  source: z.string().default("direct"),
  sourceMetadata: z.any().optional(),
  sourceUrl: z.string().optional(),
  platformId: z.string().optional(),
  createdAt: z.string().optional()
});

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  isPremium: z.boolean().default(false),
  stripeCustomerId: z.string().optional(),
  createdAt: z.string().optional(),
  marketingEmails: z.boolean().default(true),
  keepMeLoggedIn: z.boolean().default(false),
  username: z.string().optional()
});

export const widgetSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  template: z.string(),
  customization: z.any(),
  testimonialIds: z.array(z.number()).optional(),
  createdAt: z.string().optional()
});
