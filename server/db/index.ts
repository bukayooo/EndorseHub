import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';

// Create pool with SSL in production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Create drizzle database instance
const drizzleDb = drizzle(pool);

// Export a combined interface that supports both raw SQL and drizzle queries
export const db = {
  ...drizzleDb,
  execute: async (query: string, values?: any[]) => {
    const result = await pool.query(query, values);
    return result;
  }
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

// Export pool for direct access if needed
export { pool };
