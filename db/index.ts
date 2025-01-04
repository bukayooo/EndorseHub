import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, sql, and, or, like, count } from "drizzle-orm";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

neonConfig.fetchConnectionCache = true;
const connection = neon(process.env.DATABASE_URL, { fullResults: false });
export const db = drizzle(connection, { schema });

// Helper functions
export async function findUserById(id: number): Promise<schema.User | null> {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return result[0] || null;
}

export async function findUserByEmail(email: string): Promise<schema.User | null> {
  const result = await db
    .select()
    .from(schema.users)
    .where(sql`LOWER(${schema.users.email}) = LOWER(${email})`)
    .limit(1);
  return result[0] || null;
}

export async function createUser(userData: schema.NewUser): Promise<schema.User> {
  const [user] = await db
    .insert(schema.users)
    .values(userData)
    .returning();
  return user;
}

export { schema, eq, desc, sql, and, or, like, count };
export const where = eq;
export const orderBy = desc;
export const whereLike = like;
export const whereOr = or;
export const whereAnd = and;
