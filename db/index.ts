import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { eq, desc, sql, and, or, like, count } from "drizzle-orm";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

neonConfig.fetchConnectionCache = true;
const connection = neon(process.env.DATABASE_URL, { fullResults: false });
export const db = drizzle(connection);

// Add a setupDb function to test the connection and run migrations
export async function setupDb(): Promise<void> {
  try {
    // Test the connection with a simple query
    await db.execute(sql`SELECT 1`);
    console.log('Database connection test successful');

    // Run migrations
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

export { schema, eq, desc, sql, and, or, like, count };
export const where = eq;
export const orderBy = desc;
export const whereLike = like;
export const whereOr = or;
export const whereAnd = and;
