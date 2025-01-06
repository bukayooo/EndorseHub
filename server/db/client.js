import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
neonConfig.fetchConnectionCache = true;
const connection = neon(process.env.DATABASE_URL, { fullResults: false });
export const db = drizzle(connection);
export { schema };
