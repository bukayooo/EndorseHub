import { db } from "../../db";
import { testimonials } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { AppError } from "../../server/lib/error";

async function findTestimonialsByUserId(userId: number) {
  try {
    console.log('[TestimonialRepo] Finding testimonials for userId:', userId);
    const results = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, userId))
      .orderBy(desc(testimonials.createdAt));
    
    console.log(`[TestimonialRepo] Found ${results.length} testimonials for userId:`, userId);
    return results;
  } catch (error) {
    console.error('[TestimonialRepo] Error finding testimonials:', error);
    throw new AppError('TESTIMONIAL_FETCH_ERROR', 'Failed to fetch testimonials');
  }
}

async function countByUserId(userId: number) {
  try {
    console.log('[TestimonialRepo] Counting testimonials for userId:', userId);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(testimonials)
      .where(eq(testimonials.userId, userId));
    
    const count = Number(result[0]?.count || 0);
    console.log(`[TestimonialRepo] Found ${count} testimonials for userId:`, userId);
    return count;
  } catch (error) {
    console.error('[TestimonialRepo] Error counting testimonials:', error);
    throw new AppError('TESTIMONIAL_COUNT_ERROR', 'Failed to count testimonials');
  }
}

async function createTestimonial(data: {
  userId: number;
  authorName: string;
  content: string;
  rating?: number;
  source?: string;
  sourceMetadata?: any;
  sourceUrl?: string;
  platformId?: string;
}) {
  try {
    console.log('[TestimonialRepo] Creating testimonial for userId:', data.userId);
    const [testimonial] = await db
      .insert(testimonials)
      .values({
        ...data,
        status: 'pending',
        createdAt: new Date()
      })
      .returning();

    console.log('[TestimonialRepo] Created testimonial:', testimonial);
    return testimonial;
  } catch (error) {
    console.error('[TestimonialRepo] Error creating testimonial:', error);
    throw new AppError('TESTIMONIAL_CREATE_ERROR', 'Failed to create testimonial');
  }
}

async function updateTestimonialStatus(testimonialId: number, status: string) {
  try {
    console.log('[TestimonialRepo] Updating testimonial status:', { testimonialId, status });
    const [testimonial] = await db
      .update(testimonials)
      .set({ status })
      .where(eq(testimonials.id, testimonialId))
      .returning();

    console.log('[TestimonialRepo] Updated testimonial:', testimonial);
    return testimonial;
  } catch (error) {
    console.error('[TestimonialRepo] Error updating testimonial status:', error);
    throw new AppError('TESTIMONIAL_UPDATE_ERROR', 'Failed to update testimonial status');
  }
}

async function deleteTestimonial(testimonialId: number) {
  try {
    console.log('[TestimonialRepo] Deleting testimonial:', testimonialId);
    const [testimonial] = await db
      .delete(testimonials)
      .where(eq(testimonials.id, testimonialId))
      .returning();

    console.log('[TestimonialRepo] Deleted testimonial:', testimonial);
    return testimonial;
  } catch (error) {
    console.error('[TestimonialRepo] Error deleting testimonial:', error);
    throw new AppError('TESTIMONIAL_DELETE_ERROR', 'Failed to delete testimonial');
  }
}

export const testimonialRepository = {
  findTestimonialsByUserId,
  countByUserId,
  createTestimonial,
  updateTestimonialStatus,
  deleteTestimonial
};
