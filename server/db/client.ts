import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql_client = neon(process.env.DATABASE_URL);
const db = drizzle(sql_client, { schema });

export type QueryResult<T> = T[];

export const dbClient = {
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const result = await sql_client.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      console.error('[Database] Query error:', error);
      throw error;
    }
  },

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const results = await this.query<T>(sql, params);
    return results[0];
  },

  async execute(sql: string, params: any[] = []): Promise<void> {
    try {
      await sql_client.query(sql, params);
    } catch (error) {
      console.error('[Database] Execute error:', error);
      throw error;
    }
  }
}; 