import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, sql, and, or, like, count } from "drizzle-orm";
import { users, testimonials, widgets, analytics } from "./schema";
import type { 
  User, 
  NewUser,
  Testimonial,
  NewTestimonial,
  Widget,
  NewWidget,
  Analytics,
  NewAnalytics
} from "./schema";

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
  const results = await db.select().from(users).where(eq(users.email, email));
  return results[0] || null;
}

export async function findUserById(id: number): Promise<User | null> {
  const results = await db.select().from(users).where(eq(users.id, id));
  return results[0] || null;
}

export async function createUser(user: NewUser): Promise<User> {
  const [newUser] = await db.insert(users).values(user).returning();
  return newUser;
}

export async function updateUser(id: number, user: Partial<User>): Promise<User | null> {
  const [updatedUser] = await db
    .update(users)
    .set(user)
    .where(eq(users.id, id))
    .returning();
  return updatedUser || null;
}

export async function deleteUser(id: number): Promise<boolean> {
  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning();
  return !!deletedUser;
}

// Export database tables
export {
  users,
  testimonials,
  widgets,
  analytics
};

// Export types
export type {
  User,
  NewUser,
  Testimonial,
  NewTestimonial,
  Widget,
  NewWidget,
  Analytics,
  NewAnalytics
};

// Export query builders
export { eq, desc, sql, and, or, like, count };
export const where = eq;
export const orderBy = desc;
export const whereLike = like;
export const whereOr = or;
export const whereAnd = and;
