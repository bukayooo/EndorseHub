export interface User {
  id: number;
  email: string;
  username: string | null;
  is_premium: boolean;
  is_admin: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  premium_expires_at: string | null;
  created_at: string | null;
  marketing_emails: boolean | null;
  keep_me_logged_in: boolean | null;
} 