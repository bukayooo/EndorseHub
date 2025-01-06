import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
async function testDatabase() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }
    const connection = neon(process.env.DATABASE_URL);
    const db = drizzle(connection);
    try {
        console.log('Testing database connection...');
        // Test basic connection
        const result = await db.execute(sql `SELECT 1`);
        console.log('Basic connection test successful');
        // Test table structure
        const tables = await db.execute(sql `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
        console.log('Current database structure:', tables.rows);
    }
    catch (error) {
        console.error('Database test failed:', error);
        process.exit(1);
    }
}
testDatabase();
