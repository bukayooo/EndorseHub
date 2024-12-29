import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "../../db/schema";
import { sql } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql_client = neon(process.env.DATABASE_URL);
export const db = drizzle(sql_client, { schema });

// Test database connection
export async function setupDb(): Promise<void> {
  try {
    // Test drizzle connection with a simple query
    const result = await db.execute(sql`SELECT 1`);
    console.log('[Database] Drizzle connection test successful');

    // Now test testimonials table
    try {
      const testimonialCount = await db.execute(sql`SELECT COUNT(*) FROM testimonials`);
      console.log('[Database] Testimonials table check successful. Count:', testimonialCount[0]?.count);
    } catch (error) {
      console.error('[Database] Testimonials table check failed:', error);
      // Don't throw here - the table might be empty or not yet created
    }
  } catch (error) {
    console.error('[Database] Connection test failed:', error);
    throw error;
  }
}

// Export for direct usage if needed
export { schema, sql };
