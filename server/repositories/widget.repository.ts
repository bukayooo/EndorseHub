import { db, sql } from "../../db";
import { widgets } from "../../db/schema";
import type { Widget, NewWidget } from "../../db/schema";

export const widgetRepository = {
  async findById(id: number): Promise<Widget | undefined> {
    const result = await db.select()
      .from(widgets)
      .where(sql`${widgets.id} = ${id}`)
      .limit(1);
    return result[0];
  },

  async findByUserId(userId: number): Promise<Widget[]> {
    return db.select()
      .from(widgets)
      .where(sql`${widgets.user_id} = ${userId}`)
      .orderBy(sql`${widgets.created_at} DESC`);
  },

  async create(data: Omit<NewWidget, "id" | "created_at">): Promise<Widget> {
    const result = await db.insert(widgets)
      .values({
        ...data,
        created_at: new Date()
      })
      .returning();
    return result[0];
  },

  async update(id: number, data: Partial<Widget>): Promise<Widget | undefined> {
    const result = await db.update(widgets)
      .set(data)
      .where(sql`${widgets.id} = ${id}`)
      .returning();
    return result[0];
  },

  async delete(id: number): Promise<void> {
    await db.delete(widgets)
      .where(sql`${widgets.id} = ${id}`);
  },

  async countByUserId(userId: number): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(widgets)
      .where(sql`${widgets.user_id} = ${userId}`);
    return Number(result[0]?.count) || 0;
  }
};
