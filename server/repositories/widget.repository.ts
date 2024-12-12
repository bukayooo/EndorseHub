
import { db } from "../../db";
import { widgets } from "@db/schema";
import { eq, sql } from "drizzle-orm";

export const widgetRepository = {
  async findByUserId(userId: number) {
    return db
      .select()
      .from(widgets)
      .where(eq(widgets.userId, userId));
  },

  async findById(id: number) {
    const [widget] = await db
      .select()
      .from(widgets)
      .where(eq(widgets.id, id))
      .limit(1);
    return widget;
  },

  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(widgets)
      .where(eq(widgets.userId, userId));
    return Number(result[0].count) || 0;
  }
};
