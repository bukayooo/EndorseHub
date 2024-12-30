import { eq } from "drizzle-orm";
import { db } from "./index";
import { testimonials } from "./schema";
import type { Testimonial, NewTestimonial } from "./schema";

export async function findTestimonialsByUserId(userId: number): Promise<Testimonial[]> {
  return db.select().from(testimonials).where(eq(testimonials.user_id, userId));
}

export async function findTestimonialById(id: number): Promise<Testimonial | null> {
  const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
  return testimonial || null;
}

export async function createTestimonial(data: Omit<NewTestimonial, 'id' | 'created_at'>): Promise<Testimonial> {
  const [testimonial] = await db.insert(testimonials)
    .values({ ...data, created_at: new Date() })
    .returning();
  return testimonial;
}

export async function updateTestimonial(id: number, data: Partial<Testimonial>): Promise<Testimonial> {
  const [testimonial] = await db.update(testimonials)
    .set(data)
    .where(eq(testimonials.id, id))
    .returning();
  return testimonial;
}

export async function deleteTestimonial(id: number): Promise<void> {
  await db.delete(testimonials).where(eq(testimonials.id, id));
} 