import { db } from "../db";
import { users } from "../db/schema";
import type { User } from "../db/schema";
import { sql } from "drizzle-orm/sql";
import bcrypt from "bcrypt";

export async function findUserById(id: number): Promise<User | undefined> {
  const result = await db.select()
    .from(users)
    .where(sql`${users.id} = ${id}`)
    .limit(1);
  return result[0];
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select()
    .from(users)
    .where(sql`${users.email} = ${email}`)
    .limit(1);
  return result[0];
}

export async function createUser(data: {
  email: string;
  password: string;
  username?: string;
}): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const result = await db.insert(users)
    .values({
      email: data.email,
      password: hashedPassword,
      username: data.username,
      isPremium: false,
      stripeCustomerId: null,
      marketingEmails: true,
      keepMeLoggedIn: false
    })
    .returning();
  return result[0];
}

export async function updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
  const result = await db.update(users)
    .set(data)
    .where(sql`${users.id} = ${id}`)
    .returning();
  return result[0];
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(users)
    .where(sql`${users.id} = ${id}`);
}

export async function validatePassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
}