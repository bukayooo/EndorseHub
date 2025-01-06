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

-- Rename columns in users table
ALTER TABLE users
  RENAME COLUMN "stripeSubscriptionId" TO "stripe_subscription_id",
  RENAME COLUMN "premiumExpiresAt" TO "premium_expires_at"; 