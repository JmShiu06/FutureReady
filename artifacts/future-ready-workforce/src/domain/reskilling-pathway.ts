import { rankFutureRoles, scenarioSkillBonus, skillPlanningScore, roleSdgUseCases, type PlanningScenario, type PlanningSignal } from '@workspace/workforce-evidence';
import { courseCatalog, type CourseResource } from './resource-catalog';
import type { LearningMilestone, OfficialRoadmapOccupation } from './types';

export type Phase = 'Foundation' | 'Core skills' | 'Apply it';
export interface PathwayStep {
  id: string; milestoneIds: string[]; skill: string; coveredSkills: string[];
  phase: Phase; kind: 'course' | 'project'; resource: CourseResource | null;
  status: 'available' | 'no-resource' | 'budget' | 'check-availability';
  hours: number | null; weeks: number | null; priority: number; scenarioBonus: number;
  why: string; whyResource: string; sdgs: number[]; activity: string;
  evidenceUrl: string | null; importance: number | null;
  marketEvidence?: { signalIndex: number; trendIndex: number; period: string; url: string; scenario: PlanningScenario };
}
export interface PathwayPlan {
  steps: PathwayStep[]; totalHours: number; totalWeeks: number; totalCostMYR: number;
  unknownDurationCount: number; unavailableCount: number; finishDate: string | null;
  sdgs: number[]; skills: string[];
}
export interface PathwayInput {
  milestones: LearningMilestone[]; roleId: string; roleTitle: string;
  occupation?: OfficialRoadmapOccupation; signals: PlanningSignal[];
  scenario: PlanningScenario; hoursPerWeek: number; budgetMYR: number; freeOnly: boolean;
  now?: Date; catalog?: CourseResource[];
}
export const portfolioMilestoneId = (roleId: string) => `${roleId}:portfolio`;
const normalized = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const basic = new Set(['reading comprehension', 'writing', 'speaking', 'active listening', 'mathematics', 'active learning', 'learning strategies']);
const costRank = (r: CourseResource) => r.cost === 'Free' ? 0 : r.cost === 'Free audit' ? 1 : r.cost === 'HRD Corp-claimable' ? 2 : 3;
export function weeksFor(hours: number | null, hoursPerWeek: number): number | null {
  if (hours === null || !Number.isFinite(hours) || hours <= 0 || !Number.isFinite(hoursPerWeek) || hoursPerWeek < 1 || hoursPerWeek > 40) return null;
  return Math.ceil(hours / hoursPerWeek);
}
/** A plan-wide budget, not a separate allowance for every course. Unpriced claimable items are not assumed free. */
export function selectResource(skill: string, catalog: CourseResource[], remainingMYR: number, freeOnly: boolean) {
  return catalog.filter(r => r.skills.some(s => normalized(s) === normalized(skill))
    && r.status === 'verified' && r.costMYR !== null && Number.isFinite(r.costMYR) && r.costMYR >= 0
    && r.costMYR <= remainingMYR && (!freeOnly || (r.costMYR === 0 && (r.cost === 'Free' || r.cost === 'Free audit'))))
    .sort((a, b) => costRank(a) - costRank(b) || a.costMYR! - b.costMYR!
      || (a.hours ?? Infinity) - (b.hours ?? Infinity) || a.id.localeCompare(b.id))[0] ?? null;
}
/** Calls the existing priority functions; no changes to market scoring or occupation ranking. */
export function buildPathway(input: PathwayInput): PathwayPlan {
  const { milestones, roleId, occupation, signals, scenario } = input;
  const catalog = input.catalog ?? courseCatalog;
  const h = Number.isFinite(input.hoursPerWeek) ? Math.max(1, Math.min(40, input.hoursPerWeek)) : 5;
  let remaining = Number.isFinite(input.budgetMYR) ? Math.max(0, input.budgetMYR) : 0;
  const ranked = occupation ? rankFutureRoles([{
    id: occupation.id, mycol: { title: occupation.title, masco4: occupation.masco4 },
    onet: { url: occupation.sourceUrl }, documentedSkills: occupation.documentedSkills, recommendationStatus: 'eligible',
  }], [], signals, scenario)[0] : null;
  const priorities = new Map(ranked?.missing.map(s => [normalized(s.name), s.priority]) ?? []);
  const importanceOf = (m: LearningMilestone) => occupation?.documentedSkills.find(s => normalized(s.name) === normalized(m.skill))?.importance ?? null;
  const priorityOf = (m: LearningMilestone) => priorities.get(normalized(m.skill))
    ?? skillPlanningScore(m.skill, m.priority === 'High' ? 5 : m.priority === 'Medium' ? 3 : 1, 0, scenario);
  const sorted = [...milestones].sort((a, b) =>
    Number(!basic.has(normalized(a.skill))) - Number(!basic.has(normalized(b.skill)))
    || priorityOf(b) - priorityOf(a) || a.skill.localeCompare(b.skill));
  const steps: PathwayStep[] = [];
  const used = new Map<string, PathwayStep>();
  for (const m of sorted) {
    // Reuse a selected course covering multiple gaps; never bill or time the same course twice.
    const existing = [...used.values()].find(s => s.resource?.skills.some(skill => normalized(skill) === normalized(m.skill)));
    if (existing) { existing.milestoneIds.push(m.id); existing.coveredSkills.push(m.skill); continue; }
    const resource = selectResource(m.skill, catalog, remaining, input.freeOnly);
    const coverage = catalog.filter(r => r.skills.some(s => normalized(s) === normalized(m.skill)));
    const status = resource ? 'available' : coverage.some(r => r.status === 'verified') ? 'budget'
      : coverage.length ? 'check-availability' : 'no-resource';
    const fallback = status === 'check-availability' || status === 'budget' ? coverage[0] : null;
    const step: PathwayStep = {
      id: m.id, milestoneIds: [m.id], skill: m.skill, coveredSkills: [m.skill],
      phase: basic.has(normalized(m.skill)) ? 'Foundation' : 'Core skills', kind: 'course',
      resource: resource ?? fallback, status, hours: resource?.hours ?? null,
      weeks: weeksFor(resource?.hours ?? null, h), priority: priorityOf(m), scenarioBonus: scenarioSkillBonus(m.skill, scenario),
      why: `Build ${m.skill.toLowerCase()} to practise a documented part of ${input.roleTitle}.`,
      whyResource: resource ? `Exact reviewed skill coverage; ${resource.cost.toLowerCase()} learning content selected before higher-cost alternatives within the remaining MYR ${remaining} budget.`
        : status === 'budget' ? 'Reviewed coverage exists, but no priced resource meets the current budget/free-only setting.'
          : status === 'check-availability' ? 'Only a provider catalogue link is available; confirm current availability, duration and price.'
            : 'No reviewed course in this catalogue covers this exact skill. No course, price or study time has been invented.',
      sdgs: resource?.sdgs ?? [4], activity: '', evidenceUrl: m.evidenceUrl ?? occupation?.sourceUrl ?? null,
      importance: importanceOf(m),
      ...(ranked ? { marketEvidence: {
        signalIndex: ranked.signalIndex, trendIndex: ranked.trendIndex, period: ranked.signal?.period ?? 'No market observation available',
        url: ranked.signal?.sourceUrl ?? '', scenario,
      } } : {}),
    };
    if (resource) { remaining -= resource.costMYR!; used.set(resource.id, step); }
    steps.push(step);
  }
  if (milestones.length) {
    const context = occupation ? roleSdgUseCases[occupation.id] : null;
    steps.push({
      id: portfolioMilestoneId(roleId), milestoneIds: [portfolioMilestoneId(roleId)],
      skill: 'Apply your skills together', coveredSkills: [...new Set(milestones.map(m => m.skill))],
      phase: 'Apply it', kind: 'project', resource: null, status: 'available', hours: 4, weeks: weeksFor(4, h),
      priority: 0, scenarioBonus: 0, importance: null, sdgs: context ? [context.goal] : [4],
      why: 'Combine your learning in one small fictional work sample and explain your decisions.',
      whyResource: 'App-authored portfolio exercise, not a course or credential. Four hours is a transparent app estimate, not a provider duration.',
      activity: `Create ${context?.context ?? 'a fictional work sample for this role'}. Use at least three pathway skills (or all if fewer). Produce a one-page brief, a process diagram or small working example, and three checks showing what works and what is uncertain. Include one accessibility or fairness safeguard. Use fictional or public aggregate data only; no personal, patient or employer records. ${context?.limitation ?? ''}`,
      evidenceUrl: occupation?.sourceUrl ?? null,
    });
  }
  return summarizePathway(steps, h, input.now);
}
/** Sequential steps each get a whole-week allowance, exactly as the step labels show. */
export function summarizePathway(steps: PathwayStep[], hoursPerWeek: number, now = new Date()): PathwayPlan {
  const timed = steps.map(s => ({ ...s, weeks: weeksFor(s.hours, hoursPerWeek) }));
  const unknownDurationCount = timed.filter(s => s.weeks === null).length;
  const totalWeeks = timed.reduce((n, s) => n + (s.weeks ?? 0), 0);
  const finish = new Date(now);
  finish.setUTCDate(finish.getUTCDate() + totalWeeks * 7);
  return {
    steps: timed, totalHours: timed.reduce((n, s) => n + (s.hours ?? 0), 0), totalWeeks,
    totalCostMYR: timed.reduce((n, s) => n + (s.status === 'available' ? s.resource?.costMYR ?? 0 : 0), 0),
    unknownDurationCount, unavailableCount: timed.filter(s => s.status !== 'available').length,
    finishDate: unknownDurationCount || !timed.length ? null : finish.toISOString().slice(0, 10),
    sdgs: [...new Set(timed.flatMap(s => s.sdgs))].sort((a, b) => a - b),
    skills: [...new Set(timed.filter(s => s.status === 'available' && s.kind === 'course').flatMap(s => s.coveredSkills))],
  };
}
export function priorityFingerprint(plan: PathwayPlan) {
  return JSON.stringify(plan.steps.map(s => [s.id, s.phase, s.priority, s.scenarioBonus]));
}
export function describePlanChanges(before: PathwayPlan, after: PathwayPlan) {
  const old = new Map(before.steps.map((s, i) => [s.id, { s, i }]));
  return after.steps.flatMap((s, i) => {
    const prev = old.get(s.id);
    return !prev ? [`${s.skill}: new step`] : prev.i !== i || prev.s.priority !== s.priority
      ? [`${s.skill}: priority ${prev.s.priority} → ${s.priority}; step ${prev.i + 1} → ${i + 1}`] : [];
  });
}
