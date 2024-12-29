import { db, eq, sql } from "../../db";
import { testimonials } from "../../db/schema";
import type { Testimonial } from "../../db/schema";

export const testimonialRepository = {
  async findById(id: number) {
    const result = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id))
      .limit(1);
    return result[0];
  },

  async findByUserId(userId: number) {
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, userId))
      .orderBy(sql`${testimonials.createdAt} DESC`);
  },

  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
    return Number(result[0]?.count) || 0;
  },

  async create(data: Omit<Testimonial, "id" | "createdAt">) {
    const [result] = await db
      .insert(testimonials)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return result;
  },

  async update(id: number, userId: number, data: Partial<Testimonial>) {
    const [result] = await db
      .update(testimonials)
      .set(data)
      .where(sql`${testimonials.id} = ${id} AND ${testimonials.userId} = ${userId}`)
      .returning();
    return result;
  },

  async delete(id: number, userId: number) {
    await db
      .delete(testimonials)
      .where(sql`${testimonials.id} = ${id} AND ${testimonials.userId} = ${userId}`);
  },

  async search(userId: number, query: string) {
    const searchTerm = `%${query.toLowerCase()}%`;
    return db
      .select()
      .from(testimonials)
      .where(sql`${testimonials.userId} = ${userId} AND (
        LOWER(${testimonials.content}) LIKE ${searchTerm} OR 
        LOWER(${testimonials.authorName}) LIKE ${searchTerm}
      )`)
      .orderBy(sql`${testimonials.createdAt} DESC`);
  }
};
