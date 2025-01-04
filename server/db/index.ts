import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, sql, and, or, like, count } from "drizzle-orm";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

neonConfig.fetchConnectionCache = true;
const connection = neon(process.env.DATABASE_URL, { fullResults: false });
export const db = drizzle(connection, { schema });

// Add a setupDb function to test the connection
export async function setupDb(): Promise<void> {
  try {
    // Test the connection with a simple query
    await db.execute(sql`SELECT 1`);
    console.log('Database connection test successful');
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }
}

export { schema, eq, desc, sql, and, or, like, count };
export const where = eq;
export const orderBy = desc;
export const whereLike = like;
export const whereOr = or;
export const whereAnd = and;
