import { db } from "../db";
import { users } from "../db/schema";
import { sql } from "drizzle-orm/sql";
import bcrypt from "bcrypt";
export async function findUserById(id) {
    const result = await db.select()
        .from(users)
        .where(sql `${users.id} = ${id}`)
        .limit(1);
    return result[0];
}
export async function findUserByEmail(email) {
    const result = await db.select()
        .from(users)
        .where(sql `${users.email} = ${email}`)
        .limit(1);
    return result[0];
}
export async function createUser(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const result = await db.insert(users)
        .values({
        email: data.email,
        password: hashedPassword,
        username: data.username,
        is_premium: false,
        stripe_customer_id: null,
        marketing_emails: true,
        keep_me_logged_in: false
    })
        .returning();
    return result[0];
}
export async function updateUser(id, data) {
    const result = await db.update(users)
        .set(data)
        .where(sql `${users.id} = ${id}`)
        .returning();
    return result[0];
}
export async function deleteUser(id) {
    await db.delete(users)
        .where(sql `${users.id} = ${id}`);
}
export async function validatePassword(user, password) {
    return bcrypt.compare(password, user.password);
}
