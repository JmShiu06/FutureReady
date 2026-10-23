import test from 'node:test';
import assert from 'node:assert/strict';
import { targetsForPathwaySkill, roleSupportsGoal } from '@workspace/workforce-evidence';
test('skills retain 4.4 baseline and HR duties have reviewed specific target reasons', () => {
  assert.deepEqual(targetsForPathwaySkill('unassessed-role', 'Programming').map(t => t.target), ['4.4']);
  assert.deepEqual(targetsForPathwaySkill('mycol-1212', 'Negotiation').map(t => t.target), ['4.4', '8.8']);
  assert.deepEqual(targetsForPathwaySkill('official:mycol-1212', 'Management of Personnel Resources').map(t => t.target), ['4.4', '8.5', '10.3']);
  for (const t of targetsForPathwaySkill('mycol-1212', 'Management of Personnel Resources')) {
    assert.ok(t.reason && t.sourceUrl.startsWith('https://sdgs.un.org/'));
    if (t.target !== '4.4') assert.match(t.dutyUrl!, /11-3121.00/);
  }
});
test('goal filtering is a predicate, never a score mutation or an invented blanket mapping', () => {
  const roles = [{ id: 'mycol-1212', score: 42 }, { id: 'mycol-2512', score: 42 }];
  const before = JSON.stringify(roles);
  assert.deepEqual(roles.filter(r => roleSupportsGoal(r.id, 10)), [roles[0]]);
  assert.equal(JSON.stringify(roles), before);
  assert.equal(roleSupportsGoal('mycol-2512', 8), false);
});
