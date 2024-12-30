import { eq } from "drizzle-orm";
import { db } from "./index";
import { analytics } from "./schema";
import type { Analytics, NewAnalytics } from "./schema";

export async function findAnalyticsByWidgetId(widgetId: number): Promise<Analytics[]> {
  return db.select().from(analytics).where(eq(analytics.widget_id, widgetId));
}

export async function createAnalytics(data: Omit<NewAnalytics, 'id' | 'created_at'>): Promise<Analytics> {
  const [analytics] = await db.insert(analytics)
    .values({ ...data, created_at: new Date() })
    .returning();
  return analytics;
}

export async function updateAnalytics(id: number, data: Partial<Analytics>): Promise<Analytics> {
  const [analytics] = await db.update(analytics)
    .set(data)
    .where(eq(analytics.id, id))
    .returning();
  return analytics;
} 