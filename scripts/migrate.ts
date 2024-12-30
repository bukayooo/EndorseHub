import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const runMigrations = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Running migrations...');
    
    // Read and execute the SQL file
    const migrationSQL = fs.readFileSync(path.join(process.cwd(), 'drizzle', '0000_rename_columns.sql'), 'utf8');
    await sql(migrationSQL);
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations(); 