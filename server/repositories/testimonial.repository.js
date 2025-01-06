import { db, eq, sql } from "../../db";
import { testimonials } from "../../db/schema";
export const testimonialRepository = {
    async findById(id) {
        const result = await db
            .select()
            .from(testimonials)
            .where(eq(testimonials.id, id))
            .limit(1);
        return result[0];
    },
    async findByUserId(userId) {
        return db
            .select()
            .from(testimonials)
            .where(eq(testimonials.user_id, userId))
            .orderBy(sql `${testimonials.created_at} DESC`);
    },
    async countByUserId(userId) {
        const result = await db
            .select({ count: sql `count(*)` })
            .from(testimonials)
            .where(eq(testimonials.user_id, userId));
        return Number(result[0]?.count) || 0;
    },
    async create(data) {
        const [result] = await db
            .insert(testimonials)
            .values({
            ...data,
            created_at: new Date(),
        })
            .returning();
        return result;
    },
    async update(id, userId, data) {
        const [result] = await db
            .update(testimonials)
            .set(data)
            .where(sql `${testimonials.id} = ${id} AND ${testimonials.user_id} = ${userId}`)
            .returning();
        return result;
    },
    async delete(id, userId) {
        await db
            .delete(testimonials)
            .where(sql `${testimonials.id} = ${id} AND ${testimonials.user_id} = ${userId}`);
    },
    async search(userId, query) {
        const searchTerm = `%${query.toLowerCase()}%`;
        return db
            .select()
            .from(testimonials)
            .where(sql `${testimonials.user_id} = ${userId} AND (
        LOWER(${testimonials.content}) LIKE ${searchTerm} OR 
        LOWER(${testimonials.author_name}) LIKE ${searchTerm}
      )`)
            .orderBy(sql `${testimonials.created_at} DESC`);
    }
};
