import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq, sql } from "drizzle-orm";

export class TestimonialRepository {
  async findByUserId(userId: number) {
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
  }

  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
    return result[0]?.count ?? 0;
  }
}

export const testimonialRepository = new TestimonialRepository();
