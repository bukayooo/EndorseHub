import type { Testimonial, Widget } from "../../../db/schema"

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
  status: number;
  success: boolean;
}

export interface StatsData {
  testimonialCount: number
  widgetCount: number
  viewCount: number
  clickCount: number
  conversionRate: string
  timestamp: string
}

export interface AnalyticsData {
  views: { date: string; count: number }[];
  clicks: { date: string; count: number }[];
  conversions: { date: string; count: number }[];
} 