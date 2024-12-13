import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

const db = drizzle(pool);

export async function setupDb(): Promise<void> {
  try {
    // Simple connection test
    await pool.query('SELECT 1');
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error; // Propagate error to server startup
  }
}

export { pool, db };
