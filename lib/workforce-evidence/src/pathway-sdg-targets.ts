import { roleSdgUseCases } from './sdg-use-cases';
/** Reviewed 2026-10-23 against UN targets and O*NET task evidence already cited
 * by roleSdgUseCases. These are conditional exercise applications, NOT official
 * skill classifications, provider endorsements or measured contributions.
 */
export interface PathwaySdgTarget {
  target: string; goal: number; reason: string; sourceUrl: string; dutyUrl?: string;
  reviewedOn: string;
}
const target = (id: string, reason: string, code?: string): PathwaySdgTarget => ({
  target: id, goal: Number(id.split('.')[0]), reason,
  sourceUrl: `https://sdgs.un.org/goals/goal${id.split('.')[0]}#targets_and_indicators`,
  ...(code ? { dutyUrl: `https://www.onetonline.org/link/summary/${code}#Tasks` } : {}),
  reviewedOn: '2026-10-23',
});
/** HR-specific review: O*NET lists bargaining/labour contracts, compensation and
 * equal-employment policy duties. Scope is the HR labour-relations subset only.
 */
export const reviewedHrSkillTargets: Record<string, PathwaySdgTarget[]> = {
  Negotiation: [target('8.8', 'In a fictional collective-bargaining exercise, negotiate fair terms while protecting labour rights; not Malaysian legal advice.', '11-3121.00')],
  'Management of Personnel Resources': [
    target('8.5', 'Review a fictional equal-pay rubric when allocating and developing staff; no claim that training closes a real pay gap.', '11-3121.00'),
    target('10.3', 'Check a fictional recruitment and promotion process for discriminatory rules and equal-opportunity barriers.', '11-3121.00'),
  ],
};
export function targetsForPathwaySkill(roleId: string, skill: string): PathwaySdgTarget[] {
  const baseline = target('4.4', `Learning and practising ${skill} builds relevant skills for employment and decent work; completion is not proof of competence or target achievement.`);
  const id = roleId.replace(/^official:/, '');
  const context = roleSdgUseCases[id];
  if (!context) return [baseline];
  const specific = id === 'mycol-1212' ? reviewedHrSkillTargets[skill] : undefined;
  return [baseline, ...(specific ?? [target(context.target,
    `Apply ${skill} in ${context.context}. ${context.limitation} This conditional exercise does not establish real-world SDG impact.`, context.onetCode)])];
}
export function roleSupportsGoal(roleId: string, goal: number) {
  if (goal === 4) return true; // Only the learning-path intention, not a blanket occupation classification.
  if (roleId === 'mycol-1212' && [8, 10].includes(goal)) return true;
  return roleSdgUseCases[roleId]?.goal === goal;
}
