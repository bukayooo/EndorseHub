-- Rename columns in users table
ALTER TABLE users
  RENAME COLUMN "isPremium" TO "is_premium",
  RENAME COLUMN "stripeCustomerId" TO "stripe_customer_id",
  RENAME COLUMN "createdAt" TO "created_at",
  RENAME COLUMN "marketingEmails" TO "marketing_emails",
  RENAME COLUMN "keepMeLoggedIn" TO "keep_me_logged_in";

-- Rename columns in testimonials table
ALTER TABLE testimonials
  RENAME COLUMN "authorName" TO "author_name",
  RENAME COLUMN "userId" TO "user_id",
  RENAME COLUMN "sourceMetadata" TO "source_metadata",
  RENAME COLUMN "sourceUrl" TO "source_url",
  RENAME COLUMN "platformId" TO "platform_id",
  RENAME COLUMN "createdAt" TO "created_at";

-- Rename columns in widgets table
ALTER TABLE widgets
  RENAME COLUMN "userId" TO "user_id",
  RENAME COLUMN "testimonialIds" TO "testimonial_ids",
  RENAME COLUMN "createdAt" TO "created_at";

-- Rename columns in analytics table
ALTER TABLE analytics
  RENAME COLUMN "widgetId" TO "widget_id"; 