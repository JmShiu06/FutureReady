import { activeBaseline, roadmapMilestones } from './learning';
import { buildPathway, type PathwayPlan, type PathwayStep } from './reskilling-pathway';
import { demoRoles } from './demo-data';
import { completionKey } from './services';
import type { WorkspaceState } from './types';
import type { PathwayPreferences } from './pathway-preferences';
export const pathwaySettingsKey = (state: WorkspaceState) => {
  const baseline = activeBaseline(state);
  return baseline ? `frw-pathway-v1:${state.audience}:${state.targets[state.audience]}:${baseline.startedAt}` : '';
};
export const stepIsDone = (state: WorkspaceState, step: PathwayStep) =>
  step.milestoneIds.every(id => !!state.completion[completionKey(state.audience, id)]);
export function pathwayProgress(plan: PathwayPlan, isDone: (step: PathwayStep) => boolean) {
  const done = plan.steps.filter(isDone).length;
  return { done, total: plan.steps.length, percent: plan.steps.length ? Math.round(100 * done / plan.steps.length) : 0 };
}
/** The grouped catalogue steps, including portfolio, are the sole displayed progress denominator.
 * Raw skill milestones remain ONLY for explicit skill-level confirmation.
 */
export function resolveActivePathway(state: WorkspaceState, preferences: PathwayPreferences, now = new Date()) {
  const baseline = activeBaseline(state);
  if (!baseline) return null;
  const roleId = state.targets[state.audience];
  return buildPathway({
    milestones: roadmapMilestones(state), roleId,
    roleTitle: baseline.occupation?.title ?? demoRoles.find(r => r.id === roleId)?.title ?? 'Selected role',
    occupation: baseline.occupation, hoursPerWeek: preferences.hours, budgetMYR: preferences.budget,
    freeOnly: preferences.freeOnly, now, ...preferences.accepted,
    completedMilestoneIds: Object.keys(state.completion).filter(key => key.startsWith(`${state.audience}:`) && state.completion[key]).map(key => key.slice(state.audience.length + 1)),
  });
}
