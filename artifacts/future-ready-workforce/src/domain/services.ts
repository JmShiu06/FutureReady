import { demoRoles, marketRecords } from './demo-data';
import type { AggregateRecord, CareerAssessment, CareerRole, DemoProfile, LearningMilestone, ProfileSkill, RadarFilters, SimulationResult, WorkforceService } from './types';

export const methodology = 'Illustrative proficiency coverage = 100 × sum(min(current level / required level, 1)) / number of required skills. Missing skills contribute 0. All requirements are weighted equally. Self-reported levels are not validated; this is not a hiring probability or demand forecast.';
export const normalizeSkill = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function assessRole(profile: Pick<DemoProfile, 'skills'>, role: CareerRole): CareerAssessment {
  const levels = new Map<string, number>();
  for (const skill of profile.skills) {
    const level = Number.isFinite(skill.level) ? Math.max(0, Math.min(5, skill.level)) : 0;
    const key = normalizeSkill(skill.name);
    levels.set(key, Math.max(levels.get(key) ?? 0, level));
  }
  const gaps = role.requiredSkills.map(required => {
    const currentLevel = levels.get(normalizeSkill(required.name)) ?? 0;
    return { ...required, currentLevel, gap: Math.max(0, required.level - currentLevel) };
  });
  const coverage = gaps.reduce((total, s) => total + Math.min(s.currentLevel / s.level, 1), 0);
  return { role, readiness: gaps.length ? Math.round(100 * coverage / gaps.length) : 0,
    present: gaps.filter(s => s.currentLevel > 0), missing: gaps.filter(s => s.currentLevel === 0),
    gaps: gaps.filter(s => s.gap > 0).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]) || b.gap - a.gap),
    methodology, illustrative: true };
}
export function rankCareers(profile: Pick<DemoProfile, 'skills'>): CareerAssessment[] {
  return demoRoles.map(role => assessRole(profile, role)).sort((a, b) => b.readiness - a.readiness || a.role.id.localeCompare(b.role.id));
}
export function simulateProfile(profile: DemoProfile, hypothetical: ProfileSkill[], roleId: string): SimulationResult {
  const role = demoRoles.find(r => r.id === roleId);
  if (!role) throw new Error('Choose an available demo career.');
  const before = assessRole(profile, role);
  const after = assessRole({ skills: hypothetical }, role);
  return { before, after, readinessChange: after.readiness - before.readiness };
}
export function buildRoadmap(profile: DemoProfile, roleId: string): LearningMilestone[] {
  const role = demoRoles.find(r => r.id === roleId);
  if (!role) throw new Error('Choose an available demo career.');
  return assessRole(profile, role).gaps.map((gap, index) => ({
    id: `${role.id}:${normalizeSkill(gap.name)}`, skill: gap.name,
    title: `Practise ${gap.name.toLowerCase()}: sample learning project`,
    provider: 'Fictional FutureReady Learning Studio', verifiedUrl: null, synthetic: true,
    durationHours: gap.gap * 6, costMYR: index % 2 === 0 ? 0 : 80,
    prerequisites: index > 0 ? ['Complete the previous milestone or demonstrate equivalent practice'] : ['No formal prerequisites in this synthetic example'],
    priority: gap.priority, order: index + 1,
  }));
}
export function filterMarket(filters: RadarFilters) {
  if (filters.from && filters.to && filters.from > filters.to) throw new Error('Start date must not be after end date.');
  return marketRecords.filter(r =>
    (!filters.category || r.category === filters.category) &&
    (!filters.roleId || r.roleIds.includes(filters.roleId)) &&
    (!filters.industry || r.industry === filters.industry) &&
    (!filters.region || r.region === filters.region),
  ).map(r => ({ ...r, observations: r.observations.filter(o => (!filters.from || o.date >= filters.from) && (!filters.to || o.date <= filters.to)) }))
    .filter(r => r.observations.length > 0);
}
function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
}
export const demoService: WorkforceService = {
  mode: 'demo', capabilities: { liveMarketRefresh: false, cvExtraction: false },
  async matchCareers(profile, signal) { abortIfNeeded(signal); return rankCareers(profile); },
  async getSkillMarket(filters, signal) { abortIfNeeded(signal); return filterMarket(filters); },
  async simulate(profile, hypothetical, roleId, signal) { abortIfNeeded(signal); return simulateProfile(profile, hypothetical, roleId); },
  async getRoadmap(profile, roleId, signal) { abortIfNeeded(signal); return buildRoadmap(profile, roleId); },
  async refreshMarket() { throw new Error('Live refresh is unavailable in demo mode. No backend market service is connected.'); },
};
/** Inject future generated Express client calls here. No endpoints are invented or called in this milestone. */
export function createApiWorkforceService(operations: Omit<WorkforceService, 'mode' | 'capabilities'>,
  capabilities: WorkforceService['capabilities']): WorkforceService {
  return { ...operations, mode: 'api', capabilities };
}
export function evidenceWarnings(evidence: CareerRole['evidence'], today = new Date()): string[] {
  const warnings: string[] = [];
  if (evidence.kind === 'synthetic') warnings.push('Synthetic example — not observed market evidence.');
  if (!evidence.sourceUrl) warnings.push('No verified source URL is available.');
  if (!evidence.lastUpdated) warnings.push('Last-updated date is missing.');
  else {
    const age = today.getTime() - new Date(evidence.lastUpdated).getTime();
    if (!Number.isFinite(age)) warnings.push('Last-updated date is invalid.');
    else if (age > 90 * 86400000) warnings.push('Record is stale: last updated more than 90 days ago.');
  }
  return warnings;
}
export function completionKey(audience: string, milestoneId: string) { return `${audience}:${milestoneId}`; }

/** Only records whose target role requires the skill belong in this denominator. */
export function meanSkillGap(records: AggregateRecord[], skill: string): { meanGap: number | null; recordCount: number } {
  const gaps: number[] = [];
  for (const record of records) {
    const role = demoRoles.find(r => r.id === record.targetRoleId);
    if (!role) throw new Error('An aggregate record has an unknown target role.');
    const required = role.requiredSkills.find(r => normalizeSkill(r.name) === normalizeSkill(skill));
    if (!required) continue;
    const assessment = assessRole(record, role);
    gaps.push(assessment.gaps.find(g => normalizeSkill(g.name) === normalizeSkill(skill))?.gap ?? 0);
  }
  return { meanGap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null, recordCount: gaps.length };
}
