import { z } from 'zod';
import { blankProfile, demoRoles } from './demo-data';
import type { Audience, DemoProfile, RoadmapBaseline, SkillConfirmation, WorkspaceState } from './types';
import { officialPlanId } from './official-roadmap';

export const STORAGE_KEY = 'frw-demo-workspace-v1';
export const audiences = ['adult', 'graduate', 'hr', 'education'] as const;
const boundedText = z.string().trim().max(120);
export const skillSchema = z.object({
  name: z.string().trim().min(1).max(60), level: z.number().int().min(1).max(5), category: boundedText,
  cvDetected: z.boolean().optional(),
});
export const profileSchema = z.object({
  id: z.string().min(1).max(80), audience: z.enum(audiences), occupation: boundedText,
  experienceYears: z.number().min(0).max(60).nullable(), education: boundedText, qualification: boundedText,
  studyField: boundedText, interests: z.array(boundedText.min(1)).max(10),
  skills: z.array(skillSchema).max(50).refine(skills => new Set(skills.map(s => s.name.normalize('NFKC').replace(/\s+/g, ' ').toLowerCase())).size === skills.length, 'Skill names must be unique.'),
  location: boundedText, workPreference: z.enum(['', 'Any', 'Remote', 'Hybrid', 'On-site']),
  learningHours: z.number().int().min(1).max(40).nullable(), budgetMYR: z.number().min(0).max(100000).nullable(),
  goals: z.string().trim().max(500),
});
const isoText = z.string().min(10).max(40);
const occupationSchema = z.object({
  id: z.string().min(1).max(60), title: z.string().min(1).max(200), edition: boundedText,
  masco4: z.string().regex(/^\d{4}$/), onetCode: boundedText, onetTitle: z.string().max(200),
  sourceUrl: z.string().url().refine(url => url.startsWith('https://www.onetonline.org/')),
  release: boundedText, selectionRule: z.string().max(3000), mappingLimitations: z.string().max(3000),
  documentedSkills: z.array(z.object({
    elementId: z.string().min(1).max(30), name: z.string().min(1).max(60),
    importance: z.number().min(0).max(5), level: z.number().min(0).max(7), levelLowPrecision: z.boolean(),
  })).min(1).max(100).refine(skills => new Set(skills.map(s => s.elementId)).size === skills.length
    && new Set(skills.map(s => s.name.toLowerCase())).size === skills.length),
});
const baselineSchema = z.object({ skills: z.array(skillSchema).max(50), startedAt: isoText, occupation: occupationSchema.optional() });
const confirmationSchema = z.object({
  id: z.string().min(1).max(200), audience: z.enum(audiences), roleId: z.string().min(1).max(80),
  milestoneId: z.string().min(1).max(200), skill: z.string().min(1).max(60),
  fromLevel: z.number().int().min(0).max(4), toLevel: z.number().int().min(1).max(5), confirmedAt: isoText,
});
export function defaultWorkspace(): WorkspaceState {
  const profiles = Object.fromEntries(audiences.map(a => [a, blankProfile(a)])) as Record<Audience, DemoProfile>;
  return { version: 1, audience: 'adult', profiles, targets: { adult: 'service-designer', graduate: 'workforce-analyst', hr: 'ai-operations', education: 'learning-partner' }, completion: {}, baselines: {}, completedAt: {}, confirmations: [] };
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
    }
    if (saved.completion && typeof saved.completion === 'object' && !Array.isArray(saved.completion)) {
      for (const [key, value] of Object.entries(saved.completion).slice(0, 2000)) {
        if (key.length <= 200 && typeof value === 'boolean' && audiences.some(a => key.startsWith(`${a}:`))) fallback.completion[key] = value;
        else recovered = true;
      }
    }
    const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
    if (isPlain(saved.baselines)) {
      for (const [key, raw] of Object.entries(saved.baselines).slice(0, 100)) {
        const [audience, ...rest] = key.split(':');
        const parsed = baselineSchema.safeParse(raw);
        const roleId = rest.join(':');
        if (parsed.success && audiences.includes(audience as Audience)
          && (parsed.data.occupation ? roleId === officialPlanId(parsed.data.occupation.id) : validRole(roleId))) fallback.baselines[key] = parsed.data as RoadmapBaseline;
        else recovered = true;
      }
    }
    // Official targets require a valid saved evidence snapshot. Legacy sample IDs stay unchanged.
    const savedTargets = saved.targets as Record<string, unknown> | undefined;
    const validSavedPlan = (audience: Audience, roleId: string) =>
      validRole(roleId) || !!fallback.baselines[`${audience}:${roleId}`]?.occupation;
    for (const audience of audiences) {
      const target = savedTargets?.[audience];
      if (typeof target === 'string' && validSavedPlan(audience, target)) fallback.targets[audience] = target;
      else recovered = true;
    }
    if (isPlain(saved.completedAt)) {
      for (const [key, value] of Object.entries(saved.completedAt).slice(0, 2000)) {
        if (key.length <= 200 && typeof value === 'string' && value.length <= 40 && fallback.completion[key]) fallback.completedAt[key] = value;
        else recovered = true;
      }
    }
    if (Array.isArray(saved.confirmations)) {
      const seen = new Set<string>();
      for (const raw of saved.confirmations.slice(0, 500)) {
        const parsed = confirmationSchema.safeParse(raw);
        if (parsed.success && validSavedPlan(parsed.data.audience, parsed.data.roleId) && !seen.has(parsed.data.id)) { seen.add(parsed.data.id); fallback.confirmations.push(parsed.data as SkillConfirmation); }
        else recovered = true;
      }
    }
    // Progress saved before roadmaps had a starting snapshot: treat today's skills as the start so it is not lost.
    for (const audience of audiences) {
      const key = `${audience}:${fallback.targets[audience]}`;
      const hasProgress = Object.keys(fallback.completion).some(k => k.startsWith(`${key}:`));
      if (hasProgress && !fallback.baselines[key]) fallback.baselines[key] = { skills: fallback.profiles[audience].skills, startedAt: new Date(0).toISOString() };
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
