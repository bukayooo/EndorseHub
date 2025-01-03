import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, sql, and, or, like, count } from "drizzle-orm";
import * as schema from "./schema";
import type { User, NewUser } from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

neonConfig.fetchConnectionCache = true;
const connection = neon(process.env.DATABASE_URL, { fullResults: false });
export const db = drizzle(connection);

// Add a setupDb function to test the connection
export async function setupDb(): Promise<void> {
  try {
    // Test the connection with a simple query
    await db.execute(sql`SELECT 1`);
    console.log('Database connection test successful');
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await db.select().from(schema.users).where(eq(schema.users.email, email));
  return users[0] || null;
}

export async function findUserById(id: number): Promise<User | null> {
  const users = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return users[0] || null;
}

export async function createUser(user: NewUser): Promise<User> {
  const [newUser] = await db.insert(schema.users).values(user).returning();
  return newUser;
}

export async function updateUser(id: number, user: Partial<User>): Promise<User | null> {
  const [updatedUser] = await db
    .update(schema.users)
    .set(user)
    .where(eq(schema.users.id, id))
    .returning();
  return updatedUser || null;
}

export async function deleteUser(id: number): Promise<boolean> {
  const [deletedUser] = await db
    .delete(schema.users)
    .where(eq(schema.users.id, id))
    .returning();
  return !!deletedUser;
}

export { schema, eq, desc, sql, and, or, like, count };
export const where = eq;
export const orderBy = desc;
export const whereLike = like;
export const whereOr = or;
export const whereAnd = and;
