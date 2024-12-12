import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

const { Pool } = pg;

// Create pool with SSL in production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Create drizzle database instance
export const db = drizzle(pool);

// Add raw query support
export const query = async (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// Database setup function
export async function setupDb() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection established successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export { pool };
