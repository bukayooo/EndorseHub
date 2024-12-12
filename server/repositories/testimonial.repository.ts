import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq } from "drizzle-orm";

export class TestimonialRepository {
  async findByUserId(userId: number) {
    console.log(`[TestimonialRepository] Finding testimonials for user ${userId}`);
    const results = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
    console.log(`[TestimonialRepository] Found ${results.length} testimonials`);
    return results;
  }

  async countByUserId(userId: number): Promise<number> {
    console.log(`[TestimonialRepository] Counting testimonials for user ${userId}`);
    const results = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
    console.log(`[TestimonialRepository] Count result: ${results.length}`);
    return results.length;
  }
}

export const testimonialRepository = new TestimonialRepository();
