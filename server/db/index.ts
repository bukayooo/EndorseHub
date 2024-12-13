import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure the connection pool with better defaults
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
});

// Monitor the pool events
pool.on('connect', (client) => {
  console.log('[Database] New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('[Database] Unexpected error on idle database client:', err);
});

pool.on('remove', () => {
  console.log('[Database] Database client removed from pool');
});

// Create drizzle instance
export const db = drizzle(pool);

// Helper function to check database health
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[Database] Health check failed:', error);
    return false;
  }
}

// Clean up function to close pool
export async function closeDb(): Promise<void> {
  try {
    await pool.end();
    console.log('[Database] Connection pool closed');
  } catch (error) {
    console.error('[Database] Error closing connection pool:', error);
    throw error;
  }
}

// Export pool for direct access if needed
export { pool };
