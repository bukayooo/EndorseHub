import { db } from "../../db";
import { widgets } from "@db/schema";
import { eq, sql } from "drizzle-orm";

export class WidgetRepository {
  async findByUserId(userId: number) {
    console.log(`[WidgetRepository] Finding widgets for user ${userId}`);
    const results = await db
      .select()
      .from(widgets)
      .where(eq(widgets.userId, userId));
    console.log(`[WidgetRepository] Found ${results.length} widgets`);
    return results;
  }

  async countByUserId(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(widgets)
        .where(eq(widgets.userId, userId));
      return result[0]?.count ?? 0;
    } catch (error) {
      console.error(`[WidgetRepository] Error counting widgets for user ${userId}:`, error);
      throw error;
    }
  }
}

export const widgetRepository = new WidgetRepository();
