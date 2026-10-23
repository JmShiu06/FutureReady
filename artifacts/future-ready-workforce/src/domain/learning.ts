import { demoRoles } from './demo-data';
import { assessRole, buildRoadmap, completionKey, normalizeSkill } from './services';
import { officialMilestones, officialPlanId } from './official-roadmap';
import { portfolioMilestoneId } from './reskilling-pathway';
import { pathwaySamples, sampleStartingSkills } from './pathway-samples';
import type { Audience, CareerAssessment, CareerRole, LearningMilestone, OfficialRoadmapOccupation, Proficiency, RoadmapBaseline, SkillConfirmation, WorkspaceState } from './types';

/**
 * Pure state transitions for the learning roadmap, completion history and confirmed skill updates.
 * Everything here is deterministic apart from the injected `now`, so the rules can be tested without React.
 */
export const planKey = (audience: Audience, roleId: string) => `${audience}:${roleId}`;
const roleOf = (roleId: string): CareerRole | undefined => demoRoles.find(r => r.id === roleId);

export function activeBaseline(state: WorkspaceState): RoadmapBaseline | null {
  return state.baselines[planKey(state.audience, state.targets[state.audience])] ?? null;
}

/** Milestones come from the starting snapshot, so confirmed improvements never delete milestones or progress. */
export function roadmapMilestones(state: WorkspaceState): LearningMilestone[] {
  const baseline = activeBaseline(state);
  if (!baseline) return [];
  if (baseline.occupation) return officialMilestones(baseline);
  return buildRoadmap({ ...state.profiles[state.audience], skills: baseline.skills }, state.targets[state.audience]);
}

/** Explicit "Build my learning roadmap": makes the role the target and keeps any earlier snapshot and progress. */
export function startRoadmap(state: WorkspaceState, roleId: string, now = new Date(), occupation?: OfficialRoadmapOccupation): WorkspaceState {
  const saved = state.baselines[planKey(state.audience, roleId)]?.occupation;
  if (!roleOf(roleId) && !(occupation && roleId === officialPlanId(occupation.id)) && !saved) throw new Error('Choose an available career with reviewed skills.');
  const key = planKey(state.audience, roleId);
  return {
    ...state,
    targets: { ...state.targets, [state.audience]: roleId },
    baselines: state.baselines[key] ? state.baselines
      : { ...state.baselines, [key]: { skills: state.profiles[state.audience].skills.map(s => ({ ...s })), startedAt: now.toISOString(), ...(occupation ? { occupation } : {}) } },
  };
}

/** Explicit sample selection creates only a starting snapshot; existing saved plans and profile stay intact. */
export function startSampleRoadmap(state: WorkspaceState, occupation: OfficialRoadmapOccupation, presetId: string, now = new Date()): WorkspaceState {
  const preset = pathwaySamples.find(s => s.id === presetId);
  if (!preset) throw new Error('Choose a synthetic sample profile.');
  const roleId = officialPlanId(occupation.id);
  const existing = state.baselines[planKey(state.audience, roleId)];
  const next = startRoadmap(state, roleId, now, occupation);
  if (existing) return next;
  return { ...next, baselines: { ...next.baselines, [planKey(state.audience, roleId)]: {
    ...next.baselines[planKey(state.audience, roleId)], skills: sampleStartingSkills(presetId), sampleLabel: preset.label,
  } } };
}

/** Idempotent: repeating the same call changes nothing, so double clicks cannot create duplicate completions. */
export function setMilestoneComplete(state: WorkspaceState, key: string, done: boolean, now = new Date()): WorkspaceState {
  const isPortfolio = !!activeBaseline(state) && key === completionKey(state.audience, portfolioMilestoneId(state.targets[state.audience]));
  if (!isPortfolio && !roadmapMilestones(state).some(m => completionKey(state.audience, m.id) === key)) return state;
  if (!!state.completion[key] === done) return state;
  const completion = { ...state.completion };
  const completedAt = { ...state.completedAt };
  if (done) { completion[key] = true; completedAt[key] = now.toISOString(); }
  else { delete completion[key]; delete completedAt[key]; }
  return { ...state, completion, completedAt };
}

export const confirmationId = (audience: Audience, milestoneId: string) => `${audience}:${milestoneId}`;
export const confirmationFor = (state: WorkspaceState, milestoneId: string) =>
  state.confirmations.find(c => c.id === confirmationId(state.audience, milestoneId));

export function currentLevel(state: WorkspaceState, skill: string): number {
  const key = normalizeSkill(skill);
  return Math.max(0, ...state.profiles[state.audience].skills.filter(s => normalizeSkill(s.name) === key).map(s => s.level));
}
/** The level offered for review: one step up, never past the role's requirement. Not applied until confirmed. */
export function proposedLevel(current: number, required: number): number | null {
  return current >= required ? null : Math.min(required, current + 1);
}

export function confirmSkillUpdate(
  state: WorkspaceState, input: { milestoneId: string; toLevel: number }, now = new Date(),
): { state: WorkspaceState; error?: string } {
  const fail = (error: string) => ({ state, error });
  const audience = state.audience;
  const milestone = roadmapMilestones(state).find(m => m.id === input.milestoneId);
  if (!milestone) return fail('That milestone is not part of your current roadmap.');
  if (!state.completion[completionKey(audience, milestone.id)]) return fail('Complete the milestone before reviewing a skill update.');
  if (confirmationFor(state, milestone.id)) return fail('A skill update was already confirmed for this milestone.');
  if (!Number.isInteger(input.toLevel) || input.toLevel < 1 || input.toLevel > 5) return fail('Choose a level from 1 to 5.');
  const from = currentLevel(state, milestone.skill);
  if (input.toLevel <= from) return fail(`Choose a level above your current level (${from}).`);
  const profile = state.profiles[audience];
  const key = normalizeSkill(milestone.skill);
  const exists = profile.skills.some(s => normalizeSkill(s.name) === key);
  if (!exists && profile.skills.length >= 50) return fail('A profile can hold up to 50 skills. Remove one first.');
  const toLevel = input.toLevel as Proficiency;
  const skills = exists
    ? profile.skills.map(s => normalizeSkill(s.name) === key ? { ...s, level: toLevel } : s)
    : [...profile.skills, { name: milestone.skill, level: toLevel, category: 'Learning confirmed' }];
  const record: SkillConfirmation = {
    id: confirmationId(audience, milestone.id), audience, roleId: state.targets[audience], milestoneId: milestone.id,
    skill: milestone.skill, fromLevel: from, toLevel, confirmedAt: now.toISOString(),
  };
  return {
    state: { ...state, profiles: { ...state.profiles, [audience]: { ...profile, skills } }, confirmations: [...state.confirmations, record] },
  };
}

/** Removes roadmap data for one audience only (used by Reset profile). */
export function clearPlanData(state: WorkspaceState, audience: Audience): WorkspaceState {
  const mine = (key: string) => key.startsWith(`${audience}:`);
  const keep = <T,>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).filter(([k]) => !mine(k)));
  return {
    ...state, completion: keep(state.completion), completedAt: keep(state.completedAt), baselines: keep(state.baselines),
    confirmations: state.confirmations.filter(c => c.audience !== audience),
  };
}

/** Clears only the active roadmap and its progress, preserving profile skills and other saved plans. */
export function resetActiveRoadmap(state: WorkspaceState): WorkspaceState {
  const audience = state.audience;
  const roleId = state.targets[audience];
  const baselineKey = planKey(audience, roleId);
  const baseline = state.baselines[baselineKey];
  if (!baseline) return state;

  const milestones = baseline.occupation
    ? officialMilestones(baseline)
    : buildRoadmap({ ...state.profiles[audience], skills: baseline.skills }, roleId);
  const activeCompletionKeys = new Set(milestones.map(m => completionKey(audience, m.id)));
  activeCompletionKeys.add(completionKey(audience, portfolioMilestoneId(roleId)));
  const keepActive = <T,>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).filter(([key]) => !activeCompletionKeys.has(key)));
  const baselines = { ...state.baselines };
  delete baselines[baselineKey];

  return {
    ...state,
    baselines,
    completion: keepActive(state.completion),
    completedAt: keepActive(state.completedAt),
    confirmations: state.confirmations.filter(c => !(c.audience === audience && c.roleId === roleId)),
  };
}

export interface ProgressReport {
  role: CareerRole; startedAt: string; start: CareerAssessment; current: CareerAssessment;
  /** Current minus starting illustrative coverage, in percentage points of the same 0-100 coverage score. */
  changePoints: number;
  skillRows: { name: string; required: number; startLevel: number; currentLevel: number; confirmed: boolean }[];
  completed: { milestone: LearningMilestone; completedAt: string | null }[];
  confirmations: SkillConfirmation[];
}
export function progressReport(state: WorkspaceState): ProgressReport | null {
  const baseline = activeBaseline(state);
  const role = roleOf(state.targets[state.audience]);
  if (!baseline || !role) return null;
  const profile = state.profiles[state.audience];
  const start = assessRole({ skills: baseline.skills }, role);
  const current = assessRole(profile, role);
  const startLevels = new Map(start.present.concat(start.missing).map(g => [normalizeSkill(g.name), g.currentLevel]));
  const confirmations = state.confirmations.filter(c => c.audience === state.audience && c.roleId === role.id);
  return {
    role, startedAt: baseline.startedAt, start, current, changePoints: current.readiness - start.readiness,
    skillRows: role.requiredSkills.map(r => ({
      name: r.name, required: r.level, startLevel: startLevels.get(normalizeSkill(r.name)) ?? 0,
      currentLevel: currentLevel(state, r.name), confirmed: confirmations.some(c => normalizeSkill(c.skill) === normalizeSkill(r.name)),
    })),
    completed: roadmapMilestones(state).filter(m => state.completion[completionKey(state.audience, m.id)])
      .map(milestone => ({ milestone, completedAt: state.completedAt[completionKey(state.audience, milestone.id)] ?? null })),
    confirmations,
  };
}
