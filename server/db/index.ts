import pkg from 'pg';
const { Pool } = pkg;

// Initialize pool with SSL configuration for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Create drizzle database instance
import { drizzle } from 'drizzle-orm/node-postgres';
export const db = drizzle(pool);

export async function setupDb() {
  try {
    // Test the connection
    await pool.query('SELECT NOW()');
    console.log('Database connection established successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

// Export pool for direct usage if needed
export { pool };
