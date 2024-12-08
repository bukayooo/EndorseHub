-- Add new columns to testimonials table
ALTER TABLE testimonials
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS platform_id text,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct';

-- Set default value for existing rows
UPDATE testimonials 
SET source = 'direct' 
WHERE source IS NULL;
