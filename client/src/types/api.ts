import type { Testimonial, Widget } from "../../../db/schema"

export interface StatsData {
  testimonialCount: number
  widgetCount: number
  viewCount: number
  clickCount: number
  conversionRate: string
  timestamp: string
}

export interface AnalyticsData {
  views: number
  clicks: number
  conversionRate: string
  timestamp: string
} 