import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, desc, sql, and, or, like, count } from "drizzle-orm";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

neonConfig.fetchConnectionCache = true;
export const db = drizzle(neon(process.env.DATABASE_URL));

export { schema, eq, desc, sql, and, or, like, count };
export const where = eq;
export const orderBy = desc;
export const whereLike = like;
export const whereOr = or;
export const whereAnd = and;

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
