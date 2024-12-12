import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

const { Pool } = pg;

// Initialize pool with basic configuration and better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add error handler to the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Create drizzle instance
const db = drizzle(pool);

// Database setup function with retry logic and proper error handling
export async function setupDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Test the connection with retries
    let retries = 5;
    while (retries > 0) {
      try {
        // Test basic connectivity
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection established successfully:', result.rows[0]);
        
        // Verify schema existence
        const schemaResult = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        console.log('Available tables:', schemaResult.rows.map(r => r.table_name));
        
        // Test specific table queries
        const testimonialsCount = await pool.query('SELECT COUNT(*) FROM testimonials');
        const widgetsCount = await pool.query('SELECT COUNT(*) FROM widgets');
        
        console.log('Database schema verification:', {
          totalTestimonials: testimonialsCount.rows[0].count,
          totalWidgets: widgetsCount.rows[0].count
        });
        
        return true;
      } catch (error) {
        console.error(`Database connection attempt failed (${retries} retries left):`, error);
        retries--;
        if (retries === 0) {
          throw new Error(`Database setup failed after ${5 - retries} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Fatal database connection error:', error);
    throw error;
  }
  return false;
}

// Export the pool and db instance
export { pool, db };
