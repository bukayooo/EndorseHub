import type { User, Testimonial as DbTestimonial, Widget as DbWidget } from '@db/schema';
import type { Json } from '@db/schema';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface StatsData {
  testimonialCount: number;
  widgetCount: number;
  viewCount: number;
  clickCount: number;
  conversionRate: string;
  timestamp: string;
}

export interface AnalyticsData {
  views: number;
  clicks: number;
  date: string;
}

// Ensure required fields are non-nullable
export interface Testimonial extends Omit<DbTestimonial, 'createdAt' | 'status' | 'source' | 'sourceMetadata' | 'sourceUrl' | 'platformId'> {
  createdAt: string;
  status: string;
  source: string;
  sourceMetadata: Json;
  sourceUrl: string | null;
  platformId: string | null;
}

export interface Widget extends Omit<DbWidget, 'createdAt' | 'testimonialIds'> {
  createdAt: string;
  testimonialIds: number[];
}

export type { User }; 