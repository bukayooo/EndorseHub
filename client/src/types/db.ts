import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";

export type User = {
  id: number;
  email: string;
  username: string;
  password: string;
  is_premium: boolean;
  marketing_emails: boolean;
  keep_me_logged_in: boolean;
  stripe_customer_id?: string;
  created_at: Date;
};

export type Testimonial = {
  id: number;
  user_id: number;
  author_name: string;
  content: string;
  rating?: number;
  source?: string;
  source_url?: string;
  source_metadata?: Record<string, any>;
  platform_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
};

export type Widget = {
  id: number;
  user_id: number;
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonial_ids: number[];
  created_at: Date;
};

export type Analytics = {
  id: number;
  widget_id: number;
  views: number;
  clicks: number;
  created_at: Date;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type StatsData = {
  totalViews: number;
  totalClicks: number;
  clickThroughRate: number;
};

export type AnalyticsData = {
  views: number;
  clicks: number;
  clickThroughRate: number;
  recentViews: Analytics[];
  recentClicks: Analytics[];
}; 