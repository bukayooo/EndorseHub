export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  subscription_status?: "free" | "premium";
}

export interface Testimonial {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  rating: number;
  created_at: string;
  source?: string;
  source_metadata?: Record<string, any>;
  source_url?: string;
  platform_id?: string;
}

export interface Widget {
  id: string;
  user_id: string;
  name: string;
  settings: Record<string, any>;
  created_at: string;
}

export interface StatsData {
  total_testimonials: number;
  average_rating: number;
  recent_testimonials: Testimonial[];
}

export interface AnalyticsData {
  views: number;
  clicks: number;
  conversions: number;
  timeline: {
    date: string;
    views: number;
    clicks: number;
    conversions: number;
  }[];
} 