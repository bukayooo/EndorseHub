DO $$ 
BEGIN
  -- Rename columns in users table if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isPremium') THEN
    ALTER TABLE users RENAME COLUMN "isPremium" TO "is_premium";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripeCustomerId') THEN
    ALTER TABLE users RENAME COLUMN "stripeCustomerId" TO "stripe_customer_id";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
    ALTER TABLE users RENAME COLUMN "createdAt" TO "created_at";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'marketingEmails') THEN
    ALTER TABLE users RENAME COLUMN "marketingEmails" TO "marketing_emails";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'keepMeLoggedIn') THEN
    ALTER TABLE users RENAME COLUMN "keepMeLoggedIn" TO "keep_me_logged_in";
  END IF;

  -- Rename columns in testimonials table if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'testimonials' AND column_name = 'authorName') THEN
    ALTER TABLE testimonials RENAME COLUMN "authorName" TO "author_name";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'testimonials' AND column_name = 'userId') THEN
    ALTER TABLE testimonials RENAME COLUMN "userId" TO "user_id";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'testimonials' AND column_name = 'sourceMetadata') THEN
    ALTER TABLE testimonials RENAME COLUMN "sourceMetadata" TO "source_metadata";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'testimonials' AND column_name = 'sourceUrl') THEN
    ALTER TABLE testimonials RENAME COLUMN "sourceUrl" TO "source_url";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'testimonials' AND column_name = 'platformId') THEN
    ALTER TABLE testimonials RENAME COLUMN "platformId" TO "platform_id";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'testimonials' AND column_name = 'createdAt') THEN
    ALTER TABLE testimonials RENAME COLUMN "createdAt" TO "created_at";
  END IF;

  -- Rename columns in widgets table if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'userId') THEN
    ALTER TABLE widgets RENAME COLUMN "userId" TO "user_id";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'testimonialIds') THEN
    ALTER TABLE widgets RENAME COLUMN "testimonialIds" TO "testimonial_ids";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'createdAt') THEN
    ALTER TABLE widgets RENAME COLUMN "createdAt" TO "created_at";
  END IF;

  -- Rename columns in analytics table if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics' AND column_name = 'widgetId') THEN
    ALTER TABLE analytics RENAME COLUMN "widgetId" TO "widget_id";
  END IF;
END $$; 