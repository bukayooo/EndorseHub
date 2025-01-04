import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '../env';
const connection = neon(env.DATABASE_URL);
export const db = drizzle(connection, {
    logger: true
});
