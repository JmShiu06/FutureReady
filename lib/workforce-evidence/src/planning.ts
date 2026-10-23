/** Transparent workshop assumptions, not an exposure dataset or a forecasting model. */
export type PlanningScenario = 'moderate' | 'fast';
export const planningScenarios = {
  moderate: { label: 'Moderate AI disruption', adaptationWeight: 8, automationWeight: 6, systemsBonus: 4, peopleBonus: 8 },
  fast: { label: 'Fast AI disruption', adaptationWeight: 24, automationWeight: 22, systemsBonus: 18, peopleBonus: 5 },
} as const;
export const taskAssumptions: Record<string, { routine: number; adaptation: number; rationale: string }> = {
  'mycol-1212': { routine: .45, adaptation: .45, rationale: 'Assume some HR administration is assisted; labour relations still require human decisions.' },
  'mycol-2221': { routine: .15, adaptation: .25, rationale: 'Assume direct clinical care remains human-led; documentation may be assisted.' },
  'mycol-2511': { routine: .65, adaptation: .85, rationale: 'Assume systems redesign and validation increase alongside assisted analysis.' },
  'mycol-2512': { routine: .75, adaptation: .90, rationale: 'Assume code drafting is assisted while requirements and testing still need review.' },
  'mycol-2521': { routine: .70, adaptation: .60, rationale: 'Assume routine administration is assisted; access and recovery decisions remain.' },
  'mycol-2524': { routine: .65, adaptation: 1, rationale: 'Assume analysis assistance increases demand for validation and interpretation in this workshop.' },
  'mycol-2531': { routine: .40, adaptation: .95, rationale: 'Assume monitoring assistance increases the importance of human risk review.' },
};
export const syntheticPlanningSkills = ['Reading Comprehension', 'Writing', 'Critical Thinking', 'Mathematics'];
export const syntheticSignalSnapshots = {
  a: { label: 'Synthetic snapshot A · 2026-04-01', date: '2026-04-01', managers: [100, 40], professionals: [100, 240] },
  b: { label: 'Synthetic snapshot B · 2026-07-01', date: '2026-07-01', managers: [100, 280], professionals: [100, 30] },
} as const;
export interface PlanningRole {
  id: string; mycol: { title: string; masco4: string }; onet: { url: string };
  recommendationStatus: string;
  documentedSkills: { name: string; importance: number }[];
}
export interface PlanningSignal { group: 'managers' | 'professionals'; previous: number; latest: number; sourceUrl: string; period: string }
const key = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const bounded = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;
export function scenarioSkillBonus(name: string, scenario: PlanningScenario) {
  const p = planningScenarios[scenario];
  return /systems|critical thinking|monitoring|programming|complex problem/i.test(name) ? p.systemsBonus
    : /listening|speaking|writing|negotiation|social perceptiveness|instructing/i.test(name) ? p.peopleBonus : 0;
}
export function skillPlanningScore(name: string, importance: number, signalIndex: number, scenario: PlanningScenario) {
  return bounded(60 * importance / 5 + .2 * signalIndex + scenarioSkillBonus(name, scenario));
}
export function rankFutureRoles(roles: PlanningRole[], skills: string[], signals: PlanningSignal[], scenario: PlanningScenario, researchWeights?: Record<string, number>) {
  const names = new Set(skills.map(key));
  const maximum = Math.max(0, ...signals.map(s => s.latest));
  const p = planningScenarios[scenario];
  return roles.filter(r => r.recommendationStatus === 'eligible').map(role => {
    const signal = signals.find(s => s.group === (role.mycol.masco4.startsWith('1') ? 'managers' : 'professionals'));
    const matched = role.documentedSkills.filter(s => names.has(key(s.name)));
    const overlap = role.documentedSkills.length ? bounded(100 * matched.length / role.documentedSkills.length) : 0;
    const signalIndex = signal && maximum > 0 ? bounded(100 * signal.latest / maximum) : 0;
    const change = signal && signal.previous > 0 ? (signal.latest - signal.previous) / signal.previous : null;
    const trendIndex = change === null ? 50 : bounded(50 + 50 * change);
    const baseline = bounded(.55 * overlap + .30 * signalIndex + .15 * trendIndex);
    const task = taskAssumptions[role.id];
    const adjustment = task ? p.adaptationWeight * task.adaptation - p.automationWeight * task.routine : 0;
    const missing = role.documentedSkills.filter(s => !names.has(key(s.name))).map(s => ({
      ...s, priority: bounded(skillPlanningScore(s.name, s.importance, .7 * signalIndex + .3 * trendIndex, scenario)
        + (researchWeights?.[s.name] ?? 0) * (scenario === 'moderate' ? .5 : 1)),
    })).sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
    return { role, overlap, signalIndex, trendIndex, change, baseline, adjustment: Math.round(adjustment * 10) / 10,
      suitability: bounded(baseline + adjustment), matched: matched.map(s => s.name), missing, signal, task };
  }).sort((a, b) => b.suitability - a.suitability || a.role.id.localeCompare(b.role.id));
}
