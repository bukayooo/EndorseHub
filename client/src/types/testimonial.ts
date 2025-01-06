export interface Testimonial {
  id: number;
  author_name: string;
  content: string;
  rating?: number;
  status: 'pending' | 'approved' | 'rejected';
  user_id: number;
  source: 'direct' | 'google' | 'tripadvisor' | 'facebook' | 'yelp';
  source_metadata?: any;
  source_url?: string;
  platform_id?: string;
  created_at: Date;
} 