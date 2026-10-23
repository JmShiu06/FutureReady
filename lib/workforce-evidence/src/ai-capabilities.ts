export interface CapabilityFact { title: string; url: string; publishedOn: string; summary: string; capability: 'coding' | 'reasoning' | 'safety' }
export interface CapabilityEffect { skill: string; weight: number; reasoning: string; evidence: { title: string; url: string; publishedOn: string }[] }
const rules = {
  coding: [
    ['Programming', -6, 'Under an assistance scenario, routine code drafting receives less relative learning emphasis; this is not declining job demand.'],
    ['Systems Evaluation', 8, 'Assisted coding makes checking outputs and system behaviour a useful human learning priority.'],
    ['Monitoring', 6, 'Human monitoring of assisted workflows remains important.'],
  ],
  reasoning: [
    ['Critical Thinking', 8, 'Reasoning-tool announcements motivate learning to challenge assumptions rather than accept generated answers.'],
    ['Complex Problem Solving', 6, 'Practise framing and validating complex problems alongside reasoning assistance.'],
    ['Judgment and Decision Making', 6, 'Keep accountable human decisions separate from tool output.'],
  ],
  safety: [
    ['Systems Evaluation', 5, 'Safety-related announcements motivate testing and documenting system limits.'],
    ['Monitoring', 7, 'Safety and security work motivates careful monitoring and incident review.'],
    ['Writing', 0, 'Keep baseline documentation practice stable in this scenario; these announcements do not establish a change in writing demand.'],
  ],
} as const;
export function capabilityEffects(facts: CapabilityFact[]): CapabilityEffect[] {
  const mapped = new Map<string, CapabilityEffect>();
  for (const fact of facts) for (const [skill, weight, reasoning] of rules[fact.capability]) {
    const entry = mapped.get(skill);
    if (entry) {
      if (!entry.evidence.some(e => e.url === fact.url)) entry.evidence.push(fact);
      // Presence-based bounded heuristic: repeated publicity cannot multiply weight.
      if (Math.abs(weight) > Math.abs(entry.weight)) { entry.weight = weight; entry.reasoning = reasoning; }
    } else mapped.set(skill, { skill, weight, reasoning, evidence: [fact] });
  }
  return [...mapped.values()];
}
export const syntheticCapabilityFacts: Record<'a' | 'b', CapabilityFact[]> = {
  a: [{ title: 'SYNTHETIC A: coding-assistance capability', url: 'https://example.invalid/synthetic-a', publishedOn: '2026-04-01', summary: 'Invented fixture, not an observed product announcement.', capability: 'coding' }],
  b: [{ title: 'SYNTHETIC B: reasoning-assistance capability', url: 'https://example.invalid/synthetic-b', publishedOn: '2026-07-01', summary: 'Invented fixture, not an observed product announcement.', capability: 'reasoning' }],
};
export function aiSkillAdjustment(skill: string, effects: CapabilityEffect[], scenario: 'moderate' | 'fast') {
  return (effects.find(e => e.skill.toLowerCase() === skill.toLowerCase())?.weight ?? 0) * (scenario === 'fast' ? 1 : .5);
}
