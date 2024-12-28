import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from 'pg';
import * as schema from "../../db/schema";
import { sql } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a single pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  application_name: 'endorsehub',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

pool.on('error', (err) => {
  console.error('[Database] Pool error:', err);
});

pool.on('connect', (client) => {
  console.log('[Database] New client connected to pool');
  client.on('error', (err) => {
    console.error('[Database] Client error:', err);
  });
});

pool.on('acquire', () => {
  console.log('[Database] Client acquired from pool');
});

pool.on('remove', () => {
  console.log('[Database] Client removed from pool');
});

// Create a single drizzle instance
export const db = drizzle(pool, { schema });

// Test database connection
export async function setupDb(): Promise<void> {
  try {
    // Test connection using pool
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version()');
      console.log('[Database] Connection test successful:', result.rows[0]);
    } finally {
      client.release();
    }

    // Test drizzle connection with a simple query
    const result = await db.execute(sql`SELECT 1`);
    console.log('[Database] Drizzle connection test successful');

    // Now test testimonials table
    try {
      const testimonialCount = await db
        .select({ count: sql`count(*)::integer` })
        .from(schema.testimonials);
      console.log('[Database] Testimonials table check successful. Count:', testimonialCount[0]?.count);
    } catch (error) {
      console.error('[Database] Testimonials table check failed:', error);
      // Don't throw here - the table might be empty or not yet created
    }
  } catch (error) {
    console.error('[Database] Connection test failed:', error);
    throw error;
  }
}

// Export pool for direct usage if needed
export { pool };
