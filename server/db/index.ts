import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('[Database] Initializing connection pool...');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false
  },
  application_name: 'testimonial-app'
});

// Enhanced error handling and logging
pool.on('connect', () => {
  console.log('[Database] New database connection established:', {
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    port: process.env.PGPORT,
    max_connections: 10
  });
});

// Add error handler for connection issues
pool.on('error', (err: Error) => {
  console.error('[Database] Unexpected error on idle client:', err);
  process.exit(-1);
});

export const db = drizzle(pool);

export async function checkConnection(): Promise<boolean> {
  let client;
  try {
    console.log('[Database] Attempting to connect...');
    client = await pool.connect();
    console.log('[Database] Connected successfully, testing query...');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('[Database] Test query successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[Database] Connection check failed:', error);
    if (error instanceof Error) {
      console.error('[Database] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return false;
  } finally {
    if (client) {
      try {
        await client.release();
        console.log('[Database] Client released successfully');
      } catch (releaseError) {
        console.error('[Database] Error releasing client:', releaseError);
      }
    }
  }
}

export async function closeDb(): Promise<void> {
  try {
    await pool.end();
    console.log('[Database] Pool closed successfully');
  } catch (error) {
    console.error('[Database] Error closing pool:', error);
    throw error;
  }
}

export { pool };