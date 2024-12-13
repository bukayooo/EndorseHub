import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('[Database] Initializing connection pool...');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false // Disable SSL for development
});

// Enhanced error handling and logging
pool.on('connect', () => {
  console.log('[Database] New client connected to database:', {
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    port: process.env.PGPORT
  });
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err);
  // Attempt to reconnect on connection errors
  if (err.message.includes('connection')) {
    console.log('[Database] Attempting to reconnect...');
    pool.connect();
  }
});

export const db = drizzle(pool);

export async function checkConnection(): Promise<boolean> {
  let client;
  try {
    console.log('[Database] Attempting to connect...');
    client = await pool.connect();
    console.log('[Database] Connected successfully, testing query...');
    await client.query('SELECT 1');
    console.log('[Database] Test query successful');
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
      client.release();
      console.log('[Database] Client released');
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
