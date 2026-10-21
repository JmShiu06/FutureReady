import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";

/** Public course catalog only. CV text, analysis payloads and user identifiers are not stored. */
export const skillLearningCoursesTable = pgTable("skill_learning_courses", {
  id: text("id").primaryKey(),
  catalogFingerprint: text("catalog_fingerprint").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
}, table => [index("skill_learning_courses_fingerprint_idx").on(table.catalogFingerprint)]);
