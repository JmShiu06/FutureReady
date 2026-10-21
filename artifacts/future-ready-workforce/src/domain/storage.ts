import { z } from 'zod';
import { sampleProfile, demoRoles } from './demo-data';
import type { Audience, DemoProfile, WorkspaceState } from './types';

export const STORAGE_KEY = 'frw-demo-workspace-v1';
export const audiences = ['adult', 'graduate', 'hr', 'education'] as const;
const boundedText = z.string().trim().max(120);
export const skillSchema = z.object({
  name: z.string().trim().min(1).max(60), level: z.number().int().min(1).max(5), category: boundedText,
  cvDetected: z.boolean().optional(),
});
export const profileSchema = z.object({
  id: z.string().min(1).max(80), audience: z.enum(audiences), occupation: z.string().trim().min(1, 'Enter an occupation or study programme.').max(120),
  experienceYears: z.number().min(0).max(60), education: boundedText, qualification: boundedText,
  studyField: boundedText, interests: z.array(boundedText.min(1)).max(10),
  skills: z.array(skillSchema).max(50).refine(skills => new Set(skills.map(s => s.name.normalize('NFKC').replace(/\s+/g, ' ').toLowerCase())).size === skills.length, 'Skill names must be unique.'),
  location: boundedText, workPreference: z.enum(['Any', 'Remote', 'Hybrid', 'On-site']),
  learningHours: z.number().int().min(1).max(40), budgetMYR: z.number().min(0).max(100000),
  goals: z.string().trim().max(500),
});
export function defaultWorkspace(): WorkspaceState {
  const profiles = Object.fromEntries(audiences.map(a => [a, sampleProfile(a)])) as Record<Audience, DemoProfile>;
  return { version: 1, audience: 'adult', profiles, targets: { adult: 'service-designer', graduate: 'workforce-analyst', hr: 'ai-operations', education: 'learning-partner' }, completion: {} };
}
const validRole = (value: unknown) => typeof value === 'string' && demoRoles.some(r => r.id === value);
export function parseWorkspace(raw: string | null): { state: WorkspaceState; warning: string } {
  const fallback = defaultWorkspace();
  if (!raw) return { state: fallback, warning: '' };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    const saved = value as Record<string, unknown>;
    if (saved.version !== 1) throw new Error();
    let recovered = false;
    if (audiences.includes(saved.audience as Audience)) fallback.audience = saved.audience as Audience;
    else recovered = true;
    for (const audience of audiences) {
      const profiles = saved.profiles as Record<string, unknown> | undefined;
      const parsed = profileSchema.safeParse(profiles?.[audience]);
      if (parsed.success && parsed.data.audience === audience) fallback.profiles[audience] = parsed.data as DemoProfile;
      else recovered = true;
      const targets = saved.targets as Record<string, unknown> | undefined;
      if (validRole(targets?.[audience])) fallback.targets[audience] = targets![audience] as string;
      else recovered = true;
    }
    if (saved.completion && typeof saved.completion === 'object' && !Array.isArray(saved.completion)) {
      for (const [key, value] of Object.entries(saved.completion).slice(0, 2000)) {
        if (key.length <= 200 && typeof value === 'boolean' && audiences.some(a => key.startsWith(`${a}:`))) fallback.completion[key] = value;
        else recovered = true;
      }
    }
    return { state: fallback, warning: recovered ? 'Some saved demo fields were invalid. Safe defaults were loaded for those fields; other audience profiles were retained.' : '' };
  } catch {
    return { state: fallback, warning: 'Saved demo data could not be read. Safe sample defaults are loaded. Your old storage has not been deleted.' };
  }
}
export interface BrowserStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function loadWorkspace(storage: BrowserStorage): ReturnType<typeof parseWorkspace> {
  try { return parseWorkspace(storage.getItem(STORAGE_KEY)); }
  catch { return { state: defaultWorkspace(), warning: 'Browser storage is unavailable. Changes will last only for this session.' }; }
}
export function persistWorkspace(storage: BrowserStorage, state: WorkspaceState): string {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return ''; }
  catch { return 'Could not save to browser storage. Your changes remain available in this session only.'; }
}
