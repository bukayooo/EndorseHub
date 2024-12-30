import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { NeonQueryFunction } from '@neondatabase/serverless';
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

neonConfig.fetchConnectionCache = true;
const sql = neon(process.env.DATABASE_URL);
// Initialize drizzle with the schema
export const db = drizzle(sql, { schema });

export type QueryResult<T> = T[];

type NeonResponse = {
  rows: any[];
  rowCount: number;
};

// Create a pool for raw SQL queries
const pool = neon(process.env.DATABASE_URL);

export const dbClient = {
  async query<T = any>(queryString: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const result = (await pool(queryString, params)) as unknown as NeonResponse;
      return result.rows as T[];
    } catch (error) {
      console.error('[Database] Query error:', error);
      throw error;
    }
  },

  async queryOne<T = any>(queryString: string, params: any[] = []): Promise<T | undefined> {
    const results = await this.query<T>(queryString, params);
    return results[0];
  },

  async execute(queryString: string, params: any[] = []): Promise<void> {
    try {
      await pool(queryString, params);
    } catch (error) {
      console.error('[Database] Execute error:', error);
      throw error;
    }
  }
}; 