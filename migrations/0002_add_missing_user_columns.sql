-- Add missing columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "premiumExpiresAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS keep_me_logged_in BOOLEAN DEFAULT FALSE; 