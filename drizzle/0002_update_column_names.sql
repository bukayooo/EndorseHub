-- Rename columns in users table
ALTER TABLE users
RENAME COLUMN stripe_customer_id TO "stripeCustomerId",
RENAME COLUMN created_at TO "createdAt",
RENAME COLUMN marketing_emails TO "marketingEmails",
RENAME COLUMN keep_me_logged_in TO "keepMeLoggedIn";

-- Rename columns in testimonials table
ALTER TABLE testimonials
RENAME COLUMN author_name TO "authorName",
RENAME COLUMN user_id TO "userId",
RENAME COLUMN source_metadata TO "sourceMetadata",
RENAME COLUMN source_url TO "sourceUrl",
RENAME COLUMN platform_id TO "platformId",
RENAME COLUMN created_at TO "createdAt";

-- Rename columns in widgets table
ALTER TABLE widgets
RENAME COLUMN user_id TO "userId",
RENAME COLUMN testimonial_ids TO "testimonialIds",
RENAME COLUMN created_at TO "createdAt";

-- Rename columns in analytics table
ALTER TABLE analytics
RENAME COLUMN widget_id TO "widgetId"; 