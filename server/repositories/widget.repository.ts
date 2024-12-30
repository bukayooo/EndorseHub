import { db, eq, sql } from "../../db";
import { widgets } from "../../db/schema";
import type { Widget } from "../../db/schema";

export const widgetRepository = {
  async findById(id: number) {
    const result = await db
      .select()
      .from(widgets)
      .where(eq(widgets.id, id))
      .limit(1);
    return result[0];
  },

  async findByUserId(userId: number) {
    return db
      .select()
      .from(widgets)
      .where(eq(widgets.user_id, userId))
      .orderBy(sql`${widgets.created_at} DESC`);
  },

  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(widgets)
      .where(eq(widgets.user_id, userId));
    return Number(result[0]?.count) || 0;
  },

  async create(data: Omit<Widget, "id" | "created_at">) {
    const [result] = await db
      .insert(widgets)
      .values({
        ...data,
        created_at: new Date(),
      })
      .returning();
    return result;
  },

  async update(id: number, userId: number, data: Partial<Widget>) {
    const [result] = await db
      .update(widgets)
      .set(data)
      .where(sql`${widgets.id} = ${id} AND ${widgets.user_id} = ${userId}`)
      .returning();
    return result;
  },

  async delete(id: number, userId: number) {
    await db
      .delete(widgets)
      .where(sql`${widgets.id} = ${id} AND ${widgets.user_id} = ${userId}`);
  }
};
