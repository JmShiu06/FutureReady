import { z } from 'zod';
import type { PlanningScenario, PlanningSignal } from '@workspace/workforce-evidence';
const signalSchema = z.object({
  group: z.enum(['managers', 'professionals']), previous: z.number().finite().nonnegative(),
  latest: z.number().finite().nonnegative(), period: z.string().max(200),
  sourceUrl: z.string().max(1500).refine(s => s === '' || s.startsWith('https://')),
});
const preferencesSchema = z.object({
  version: z.literal(1), hours: z.number().int().min(1).max(40),
  budget: z.number().min(0).max(100000), freeOnly: z.boolean(),
  accepted: z.object({ scenario: z.enum(['moderate', 'fast']), signals: z.array(signalSchema).max(10),
    researchWeights: z.record(z.string().max(100), z.number().min(-10).max(10)).optional(),
    researchFetchedAt: z.string().max(80).optional(), researchSource: z.enum(['arxiv', 'demo', 'unavailable']).optional() }),
  ignoredFingerprint: z.string().max(50000).optional(),
});
export type PathwayPreferences = z.infer<typeof preferencesSchema>;
export function readPathwayPreferences(raw: string | null, scenario: PlanningScenario, signals: PlanningSignal[], hours = 5, budget = 0) {
  const fallback: PathwayPreferences = { version: 1, hours, budget, freeOnly: false, accepted: { scenario, signals } };
  if (!raw) return { value: fallback, warning: '' };
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { value: parsed.data, warning: '' };
  } catch { /* Invalid settings must not erase workspace completion or baselines. */ }
  return { value: fallback, warning: 'Saved pathway settings could not be read. Controls were reset; your milestone progress is preserved.' };
}
