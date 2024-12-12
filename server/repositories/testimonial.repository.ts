
import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq } from "drizzle-orm";

export const testimonialRepository = {
  async findByUserId(userId: number) {
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
  },

  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
    return Number(result[0].count) || 0;
  }
};
