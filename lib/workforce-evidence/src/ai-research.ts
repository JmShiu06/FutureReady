/** Reviewed directional hypotheses, NOT evidence that papers cause occupational demand.
 * Growth is a research-activity proxy. Skill weights in [-10,10]; zero previous
 * papers is undefined (null), never an invented percentage.
 */
export const aiCapabilities = [
  { id: 'code', label: 'Code generation', query: 'all:"code generation" AND (cat:cs.AI OR cat:cs.CL OR cat:cs.SE)', directions: { Programming: -1, 'Systems Evaluation': 1, 'Critical Thinking': 1 } },
  { id: 'documents', label: 'Document summarisation', query: 'all:summarization AND (cat:cs.CL OR cat:cs.AI)', directions: { Writing: -1, 'Reading Comprehension': 1, 'Critical Thinking': 1 } },
  { id: 'speech', label: 'Speech & translation', query: '(all:"speech recognition" OR all:"machine translation") AND cat:cs.CL', directions: { Speaking: -1, 'Active Listening': 1, 'Social Perceptiveness': 1 } },
  { id: 'agents', label: 'AI agents / tool use', query: '(all:"language agents" OR all:"tool use") AND (cat:cs.AI OR cat:cs.CL)', directions: { Monitoring: 1, 'Systems Evaluation': 1, 'Judgment and Decision Making': 1 } },
  { id: 'analysis', label: 'Data analysis', query: 'all:"data analysis" AND (cat:cs.AI OR cat:cs.LG)', directions: { Mathematics: -1, 'Systems Analysis': 1, 'Judgment and Decision Making': 1 } },
] as const;
export interface ResearchCount {
  capability: string; label: string; query: string; currentQueryUrl: string; previousQueryUrl: string;
  current: number; previous: number; growth: number | null;
}
export interface ResearchSnapshot {
  source: string; fetchedAt: string; currentStart: string; previousStart: string; end: string;
  counts: ResearchCount[]; weights: Record<string, number>;
}
export const researchLabel = 'AI research activity, a proxy for AI progress, not a forecast';
export function researchWeights(counts: ResearchCount[]): Record<string, number> {
  const values: Record<string, number[]> = {};
  for (const c of counts) {
    const capability = aiCapabilities.find(a => a.id === c.capability);
    if (!capability || c.previous <= 0 || !Number.isFinite(c.current) || c.current < 0) continue;
    const growth = (c.current - c.previous) / c.previous;
    // +/-100% growth saturates at +/-10. Multiple capability contributions are averaged.
    const strength = Math.max(-10, Math.min(10, 10 * growth));
    for (const [skill, direction] of Object.entries(capability.directions)) {
      (values[skill] ??= []).push(strength * direction);
    }
  }
  return Object.fromEntries(Object.entries(values).map(([skill, v]) => [skill, Math.round(100 * v.reduce((a, b) => a + b, 0) / v.length) / 100]));
}
export function researchSkillEffect(skill: string, scenario: 'moderate' | 'fast', weights?: Record<string, number>) {
  return (weights?.[skill] ?? 0) * (scenario === 'moderate' ? .5 : 1);
}
