import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
async function runMigration() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }
    const sql = await readFileSync(join(__dirname, '../migrations/0002_add_missing_user_columns.sql'), 'utf8');
    const connection = neon(process.env.DATABASE_URL);
    try {
        console.log('Running SQL migration...');
        await connection(sql);
        console.log('SQL migration completed successfully');
    }
    catch (error) {
        console.error('SQL migration failed:', error);
        process.exit(1);
    }
}
runMigration();
