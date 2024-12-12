import pkg from 'pg';
const { Pool } = pkg;

// Initialize pool with SSL configuration for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Database interface with proper typing
interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export const db = {
  async execute<T = any>(query: string): Promise<QueryResult<T>>;
  async execute<T = any>(query: string, params: any[]): Promise<QueryResult<T>>;
  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const result = await pool.query(query, params);
    return { rows: result.rows, rowCount: result.rowCount };
  },

  async transaction<T>(callback: (client: pkg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

export async function setupDb() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection established successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

// Export for direct access if needed
export { pool, type Pool };
