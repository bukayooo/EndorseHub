import { eq } from "drizzle-orm";
import { db } from "./index";
import { widgets } from "./schema";
import type { Widget, NewWidget } from "./schema";

export async function findWidgetsByUserId(userId: number): Promise<Widget[]> {
  return db.select().from(widgets).where(eq(widgets.user_id, userId));
}

export async function findWidgetById(id: number): Promise<Widget | null> {
  const [widget] = await db.select().from(widgets).where(eq(widgets.id, id));
  return widget || null;
}

export async function createWidget(data: Omit<NewWidget, 'id' | 'created_at'>): Promise<Widget> {
  const [widget] = await db.insert(widgets)
    .values({ ...data, created_at: new Date() })
    .returning();
  return widget;
}

export async function updateWidget(id: number, data: Partial<Widget>): Promise<Widget> {
  const [widget] = await db.update(widgets)
    .set(data)
    .where(eq(widgets.id, id))
    .returning();
  return widget;
}

export async function deleteWidget(id: number): Promise<void> {
  await db.delete(widgets).where(eq(widgets.id, id));
} 