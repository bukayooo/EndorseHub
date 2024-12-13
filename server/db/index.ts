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
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Add error handler to prevent pool crashing on errors
pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err);
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

// Create drizzle instance with better error handling
export const db = drizzle(pool, {
  logger: {
    logQuery: process.env.NODE_ENV === 'development' ? console.log : false,
    logError: console.error,
  }
});

// Helper function to check database health and schema
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      // Verify basic connectivity
      await client.query('SELECT 1');
      console.log('[Database] Basic connectivity test passed');
      
      // Verify table structure
      const tables = ['users', 'testimonials', 'widgets', 'analytics'];
      for (const table of tables) {
        const tableResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        if (!tableResult.rows[0].exists) {
          console.error(`[Database] Table '${table}' does not exist`);
          return false;
        }
        console.log(`[Database] Table '${table}' exists`);
      }

      console.log('[Database] Connection test successful and schema verified');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Database] Health check failed:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      hint: error.hint,
      detail: error.detail
    });
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
