import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

const { Pool } = pg;

// Initialize pool with basic configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create drizzle instance
const db = drizzle(pool);

// Database setup function with retry logic and proper error handling
export async function setupDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Test the connection with retries
    let retries = 5;
    while (retries > 0) {
      try {
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection established successfully:', result.rows[0]);
        return true;
      } catch (error) {
        console.error(`Database connection attempt failed (${retries} retries left):`, error);
        retries--;
        if (retries === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Fatal database connection error:', error);
    throw error;
  }
  return false;
}

// Export the pool and db instance
export { pool, db };
