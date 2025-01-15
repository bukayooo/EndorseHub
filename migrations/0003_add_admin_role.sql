-- Add admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Set your account as admin
UPDATE users SET is_admin = TRUE WHERE id = 13;

-- Remove your premium status as requested
UPDATE users 
SET 
  is_premium = FALSE,
  "stripeSubscriptionId" = NULL,
  "premiumExpiresAt" = NULL 
WHERE id = 13; 