import { sql } from "drizzle-orm";
import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export async function up(db: any) {
  await db.execute(sql`
    -- Add source enum type
    DO $$ BEGIN
      CREATE TYPE source_type AS ENUM ('direct', 'google', 'tripadvisor', 'yelp');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Update source column to use enum
    ALTER TABLE testimonials 
    ALTER COLUMN source TYPE source_type 
    USING source::source_type;

    -- Add new columns for imported reviews
    ALTER TABLE testimonials
    ADD COLUMN IF NOT EXISTS source_metadata jsonb,
    ADD COLUMN IF NOT EXISTS source_url text,
    ADD COLUMN IF NOT EXISTS platform_id text;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    -- Remove new columns
    ALTER TABLE testimonials
    DROP COLUMN IF EXISTS source_metadata,
    DROP COLUMN IF EXISTS source_url,
    DROP COLUMN IF EXISTS platform_id;

    -- Revert source column to text
    ALTER TABLE testimonials
    ALTER COLUMN source TYPE text;

    -- Drop enum type
    DROP TYPE IF EXISTS source_type;
  `);
} 