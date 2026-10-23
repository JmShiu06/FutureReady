import { pgTable, serial, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
export const trendSnapshots = pgTable('public_trend_snapshots', {
  id: serial('id').primaryKey(), sourceKey: text('source_key').notNull(),
  payload: jsonb('payload').notNull(), fingerprint: text('fingerprint').notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
});
export const insertTrendSnapshotSchema = createInsertSchema(trendSnapshots).omit({ id: true, savedAt: true });
export type TrendSnapshot = typeof trendSnapshots.$inferSelect;
