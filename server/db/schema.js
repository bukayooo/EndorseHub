import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
export const testimonials = pgTable('testimonials', {
    id: serial('id').primaryKey(),
    userId: integer('userId').notNull(),
    authorName: text('authorName').notNull(),
    content: text('content').notNull(),
    rating: integer('rating'),
    status: text('status').default('pending').notNull(),
    source: text('source').default('direct').notNull(),
    sourceMetadata: jsonb('sourceMetadata'),
    sourceUrl: text('sourceUrl'),
    platformId: text('platformId'),
    createdAt: timestamp('createdAt').defaultNow().notNull()
});
