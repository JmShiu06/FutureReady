import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankFutureRoles, syntheticPlanningSkills, syntheticSignalSnapshots, roleSdgUseCases, type PlanningSignal } from '@workspace/workforce-evidence';
import { matchOccupations, getOccupationSources } from '../../../api-server/src/lib/occupationEvidence';
import { learningSchedule } from './learning-schedule';
import { occupationSnapshot, officialMilestones } from './official-roadmap';
import type { OccupationEvidenceResult } from '@workspace/api-client-react';
const roles = matchOccupations([]).occupations;
const signals = (id: 'a' | 'b'): PlanningSignal[] => (['managers', 'professionals'] as const).map(group => ({
  group, previous: syntheticSignalSnapshots[id][group][0], latest: syntheticSignalSnapshots[id][group][1], sourceUrl: '', period: id,
}));
test('same fictional skills + two synthetic snapshots change role and cross-role skill priorities, never overlap', () => {
  const a = rankFutureRoles(roles, syntheticPlanningSkills, signals('a'), 'moderate');
  const b = rankFutureRoles(roles, syntheticPlanningSkills, signals('b'), 'moderate');
  assert.notEqual(a[0].role.id, b[0].role.id);
  assert.notEqual(a[0].missing[0].name, b[0].missing[0].name);
  for (const r of a) assert.equal(r.overlap, b.find(x => x.role.id === r.role.id)!.overlap);
});
test('same profile and signals yield different explained scenario rankings and learning order', () => {
  const moderate = rankFutureRoles(roles, syntheticPlanningSkills, signals('a'), 'moderate');
  const fast = rankFutureRoles(roles, syntheticPlanningSkills, signals('a'), 'fast');
  assert.notDeepEqual(moderate.map(r => r.role.id), fast.map(r => r.role.id));
  assert.notEqual(moderate[0].missing[0].name, fast[0].missing[0].name);
  for (const r of fast) {
    assert.ok(r.task?.rationale);
    assert.ok(roleSdgUseCases[r.role.id]?.target);
    assert.ok(r.missing.every(s => s.priority >= 0 && s.priority <= 100));
    assert.equal(r.overlap, moderate.find(x => x.role.id === r.role.id)!.overlap);
  }
});
test('changing only prior-quarter observations changes trend component without changing overlap or latest index', () => {
  const a = rankFutureRoles(roles, syntheticPlanningSkills, signals('a'), 'moderate');
  const b = rankFutureRoles(roles, syntheticPlanningSkills, signals('a').map(s => ({ ...s, previous: s.latest * 3 })), 'moderate');
  assert.notEqual(a[0].baseline, b.find(x => x.role.id === a[0].role.id)!.baseline);
  for (const r of a) {
    const other = b.find(x => x.role.id === r.role.id)!;
    assert.equal(r.overlap, other.overlap); assert.equal(r.signalIndex, other.signalIndex);
  }
});
test('complete HR demo has real resources, honest practices, SDG context and a capacity-respecting weekly schedule', () => {
  const evidence = { ...matchOccupations([]), sources: getOccupationSources() } as OccupationEvidenceResult;
  const hr = evidence.occupations.find(o => o.id === 'mycol-1212')!;
  const steps = officialMilestones({ skills: [], startedAt: '', occupation: occupationSnapshot(hr, evidence) });
  assert.equal(steps.length, 22);
  assert.ok(steps.some(m => m.verifiedUrl?.includes('open.edu/openlearn')));
  assert.ok(steps.some(m => m.kind === 'practice' && /App-estimated/.test(m.timeBasis!)));
  assert.ok(steps.every(m => m.activity && m.evidenceUrl && m.reviewedAt && m.costCaveat && m.costMYR === 0));
  const weeks = learningSchedule(steps, 5);
  assert.ok(weeks.every(w => w.hours <= 5));
  assert.equal(weeks.reduce((sum, w) => sum + w.hours, 0), steps.reduce((sum, m) => sum + m.durationHours!, 0));
  assert.deepEqual(learningSchedule(steps, 0), []);
});
