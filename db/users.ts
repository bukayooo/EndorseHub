import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import type { User } from "./schema";

export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user || null;
}

export async function findUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export async function createUser(email: string, password: string): Promise<User> {
  const [user] = await db.insert(users)
    .values({ 
      email, 
      password, 
      is_premium: false,
      stripe_customer_id: null,
      created_at: new Date(),
      marketing_emails: true,
      keep_me_logged_in: false,
      username: null
    })
    .returning();
  return user;
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const [user] = await db.update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
} 