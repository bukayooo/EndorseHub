import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq, sql } from "drizzle-orm";

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
    try {
      console.log(`[TestimonialRepository] Starting count query for user ${userId}`);
      
      // Execute the count query with explicit type
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(testimonials)
        .where(eq(testimonials.userId, userId));

      // Log the raw query result for debugging
      console.log('[TestimonialRepository] Raw query result:', result);
      
      const count = result[0]?.count ?? 0;
      console.log(`[TestimonialRepository] Final count for user ${userId}: ${count}`);
      return count;
    } catch (error) {
      console.error('[TestimonialRepository] Error counting testimonials:', error);
      throw error;
    }
  }
}

export const testimonialRepository = new TestimonialRepository();
