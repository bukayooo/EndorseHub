import { db, sql } from "../../db";
import { widgets } from "../../db/schema";
export const widgetRepository = {
    async findById(id) {
        const result = await db.select()
            .from(widgets)
            .where(sql `${widgets.id} = ${id}`)
            .limit(1);
        return result[0];
    },
    async findByUserId(userId) {
        return db.select()
            .from(widgets)
            .where(sql `${widgets.user_id} = ${userId}`)
            .orderBy(sql `${widgets.created_at} DESC`);
    },
    async create(data) {
        const result = await db.insert(widgets)
            .values(data)
            .returning();
        return result[0];
    },
    async update(id, data) {
        const result = await db.update(widgets)
            .set(data)
            .where(sql `${widgets.id} = ${id}`)
            .returning();
        return result[0];
    },
    async delete(id) {
        await db.delete(widgets)
            .where(sql `${widgets.id} = ${id}`);
    },
    async countByUserId(userId) {
        const result = await db.select({ count: sql `count(*)` })
            .from(widgets)
            .where(sql `${widgets.user_id} = ${userId}`);
        return Number(result[0]?.count) || 0;
    }
};
