import test from 'node:test';
import assert from 'node:assert/strict';
import { aiCapabilities, researchWeights, researchSkillEffect, rankFutureRoles, type ResearchCount } from '@workspace/workforce-evidence';
const count = (current: number, previous: number): ResearchCount => ({
  capability: 'code', label: 'Test-only synthetic counts', query: 'test', currentQueryUrl: '', previousQueryUrl: '', current, previous, growth: null,
});
test('research proxy preserves reviewed directions, bounds and Moderate/Fast multipliers', () => {
  const weights = researchWeights([count(300, 100)]);
  assert.equal(weights.Programming, -10);
  assert.equal(weights['Systems Evaluation'], 10);
  assert.equal(researchSkillEffect('Programming', 'moderate', weights), -5);
  assert.equal(researchSkillEffect('Programming', 'fast', weights), -10);
  assert.deepEqual(researchWeights([count(10, 0)]), {});
  assert.equal(aiCapabilities.length, 5);
});
test('research changes learning priority only, not occupational overlap, suitability or baseline ranking', () => {
  const roles = [{ id: 'mycol-2512', mycol: { title: 'Software Developers', masco4: '2512' }, onet: { url: '' }, recommendationStatus: 'eligible',
    documentedSkills: [{ name: 'Programming', importance: 4 }, { name: 'Systems Evaluation', importance: 4 }] }];
  const before = rankFutureRoles(roles, ['Programming'], [], 'fast')[0];
  const after = rankFutureRoles(roles, ['Programming'], [], 'fast', researchWeights([count(200, 100)]))[0];
  assert.equal(before.overlap, after.overlap);
  assert.equal(before.suitability, after.suitability);
  assert.equal(before.baseline, after.baseline);
  assert.equal(after.missing[0].priority - before.missing[0].priority, 10);
});
