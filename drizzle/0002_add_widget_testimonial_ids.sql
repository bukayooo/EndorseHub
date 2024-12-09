-- Add testimonialIds column to widgets table
ALTER TABLE widgets
ADD COLUMN IF NOT EXISTS testimonial_ids integer[];

-- Set default empty array for existing rows
UPDATE widgets 
SET testimonial_ids = '{}'::integer[] 
WHERE testimonial_ids IS NULL;
