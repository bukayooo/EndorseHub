import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure the connection pool with better defaults
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
  maxUses: 7500, // Close & replace a connection after it has been used this many times
});

// Monitor the pool events
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client:', err);
});

pool.on('remove', () => {
  console.log('Database client removed from pool');
});

// Create drizzle instance
const db = drizzle(pool);

// Helper function to check database health
async function checkConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Initialize database with retries
export async function setupDb(maxRetries = 5, retryDelay = 2000): Promise<void> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      console.log(`[Database] Attempting to connect (attempt ${retries + 1}/${maxRetries})...`);
      await pool.query('SELECT 1');
      console.log('[Database] Connection established successfully');
      return;
    } catch (error) {
      retries++;
      console.error(`[Database] Connection attempt ${retries} failed:`, error);
      
      if (retries === maxRetries) {
        console.error('[Database] Max retries reached, failing...');
        throw new Error('Failed to establish database connection after multiple attempts');
      }
      
      console.log(`[Database] Waiting ${retryDelay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
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

export { pool, db, checkConnection };
