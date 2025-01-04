import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, sql, and, or, like, count } from "drizzle-orm";
import * as schema from './schema';
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
const connection = neon(process.env.DATABASE_URL);
export const db = drizzle(connection, {
    schema,
    logger: true
});
// Helper functions
export async function findUserById(id) {
    const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
    return result[0] || null;
}
export async function findUserByEmail(email) {
    const result = await db
        .select()
        .from(schema.users)
        .where(sql `LOWER(${schema.users.email}) = LOWER(${email})`)
        .limit(1);
    return result[0] || null;
}
export async function createUser(userData) {
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
