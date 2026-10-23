import { createHash } from 'node:crypto';
import { db, trendSnapshots } from '@workspace/db';
import { desc, eq } from 'drizzle-orm';
export async function loadTrendSnapshot(key: string): Promise<unknown | null> {
  const [row] = await db.select().from(trendSnapshots).where(eq(trendSnapshots.sourceKey, key)).orderBy(desc(trendSnapshots.id)).limit(1);
  return row?.payload ?? null;
}
export async function saveTrendSnapshot(key: string, payload: unknown) {
  const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  await db.insert(trendSnapshots).values({ sourceKey: key, payload, fingerprint });
}
