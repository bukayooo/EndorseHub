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
    console.log(`[WidgetRepository] Counting widgets for user ${userId}`);
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(widgets)
      .where(eq(widgets.userId, userId));
    const count = result[0]?.count ?? 0;
    console.log(`[WidgetRepository] Count result: ${count}`);
    return count;
  }
}

export const widgetRepository = new WidgetRepository();
