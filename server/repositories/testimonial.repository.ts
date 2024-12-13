import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq, sql } from "drizzle-orm";

export const testimonialRepository = {
  async findByUserId(userId: number) {
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
  },

  async countByUserId(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(testimonials)
        .where(eq(testimonials.userId, userId));
      console.log('[Repository] Testimonial count for user', userId, ':', result[0]?.count);
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('[Repository] Error counting testimonials:', error);
      throw error;
    }
  }
};
