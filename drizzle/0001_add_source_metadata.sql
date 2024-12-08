-- Add source_metadata column to testimonials table
ALTER TABLE testimonials
ADD COLUMN IF NOT EXISTS source_metadata jsonb;

-- Update existing rows to have empty metadata
UPDATE testimonials 
SET source_metadata = '{}'::jsonb 
WHERE source_metadata IS NULL;
