import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateRecords, demoRoles, sampleProfile, sdgGoals, sdgMappings } from './demo-data.ts';
import { assessRole, buildRoadmap, completionKey, createApiWorkforceService, demoService, evidenceWarnings, filterMarket, meanSkillGap, rankCareers, simulateProfile } from './services.ts';
import { defaultWorkspace, loadWorkspace, parseWorkspace, persistWorkspace, profileSchema } from './storage.ts';

test('readiness is deterministic proficiency coverage, separate from market demand', () => {
  const role = demoRoles[0];
  const empty = assessRole({ skills: [] }, role);
  assert.equal(empty.readiness, 0);
  assert.equal(empty.missing.length, role.requiredSkills.length);
  const full = { skills: role.requiredSkills.map(s => ({ ...s, category: 'Synthetic' })) };
  assert.equal(assessRole(full, role).readiness, 100);
  const partial = { skills: [{ name: role.requiredSkills[0].name, level: 1 as const, category: 'Demo' }] };
  assert.equal(assessRole(partial, role).readiness, 8);
  assert.deepEqual(rankCareers(sampleProfile('adult')), rankCareers(sampleProfile('adult')));
});
test('normalisation and duplicate skills cannot inflate coverage', () => {
  const skills = [{ name: ' customer   research ', level: 3 as const, category: 'Demo' }, { name: 'CUSTOMER RESEARCH', level: 1 as const, category: 'Demo' }];
  assert.equal(assessRole({ skills }, demoRoles[0]).readiness, 25);
  assert.equal(profileSchema.safeParse({ ...sampleProfile('adult'), skills }).success, false);
});
test('simulation leaves the current profile untouched and improvements are monotonic', () => {
  const profile = sampleProfile('adult');
  const original = JSON.stringify(profile);
  const role = demoRoles[0];
  const hypothetical = role.requiredSkills.map(s => ({ name: s.name, level: s.level, category: 'Simulation' }));
  const result = simulateProfile(profile, hypothetical, role.id);
  assert.equal(result.after.readiness, 100);
  assert.ok(result.readinessChange >= 0);
  assert.equal(JSON.stringify(profile), original);
  assert.throws(() => simulateProfile(profile, [], 'missing'), /Choose/);
});
test('roadmaps are priority-ordered, linked to real gaps and never invent verified courses', () => {
  const profile = sampleProfile('adult');
  const plan = buildRoadmap(profile, demoRoles[0].id);
  assert.ok(plan.length > 0);
  assert.ok(plan.every((m, i) => m.order === i + 1 && m.synthetic && m.verifiedUrl === null && m.durationHours > 0));
  const ready = { ...profile, skills: demoRoles[0].requiredSkills.map(s => ({ ...s, category: 'Demo' })) };
  assert.equal(buildRoadmap(ready, demoRoles[0].id).length, 0);
  assert.notEqual(completionKey('adult', plan[0].id), completionKey('graduate', plan[0].id));
});
test('radar filters affect records and historical observations, invalid ranges fail explicitly', () => {
  const records = filterMarket({ region: 'Malaysia', category: 'Digital', from: '2026-04-01', to: '2026-07-01' });
  assert.ok(records.length > 0);
  assert.ok(records.every(r => r.region === 'Malaysia' && r.category === 'Digital' && r.observations.length === 2));
  assert.equal(filterMarket({ from: '2030-01-01' }).length, 0);
  assert.throws(() => filterMarket({ from: '2026-10-01', to: '2026-01-01' }), /Start date/);
  assert.ok(filterMarket({ roleId: 'ai-operations' }).every(r => r.roleIds.includes('ai-operations')));
});
test('demo refresh is unavailable, API integration requires explicit injected operations', async () => {
  await assert.rejects(demoService.refreshMarket(), /unavailable in demo/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(demoService.matchCareers(sampleProfile('adult'), controller.signal), /cancelled/);
  const api = createApiWorkforceService(demoService, { liveMarketRefresh: false, cvExtraction: false });
  assert.equal(api.mode, 'api');
  assert.deepEqual(await api.matchCareers(sampleProfile('adult')), rankCareers(sampleProfile('adult')));
});
test('defensive parsing handles malformed storage, partial profiles and schema versions', () => {
  for (const raw of ['null', '[]', '42', '{', '{"version":2}']) {
    const loaded = parseWorkspace(raw);
    assert.equal(loaded.state.audience, 'adult');
    assert.ok(loaded.warning);
  }
  const state = defaultWorkspace();
  state.profiles.graduate.goals = 'Keep this separate graduate goal';
  const damaged = JSON.parse(JSON.stringify(state));
  damaged.profiles.adult.skills = 'invalid';
  const recovered = parseWorkspace(JSON.stringify(damaged));
  assert.ok(recovered.warning);
  assert.equal(recovered.state.profiles.graduate.goals, state.profiles.graduate.goals);
  assert.deepEqual(recovered.state.profiles.adult, sampleProfile('adult'));
});
test('storage round trip preserves all audience profiles, targets and per-audience completion', () => {
  const state = defaultWorkspace();
  state.audience = 'education';
  state.profiles.hr.budgetMYR = 800;
  state.completion['adult:service-designer:facilitation'] = true;
  assert.deepEqual(parseWorkspace(JSON.stringify(state)).state, state);
});
test('storage failures are visible, not thrown or silently reported as saved', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.ok(loadWorkspace(broken).warning.includes('unavailable'));
  assert.ok(persistWorkspace(broken, defaultWorkspace()).includes('Could not save'));
});
test('validation bounds prevent invalid budgets, levels, hours and empty programme', () => {
  const profile = sampleProfile('graduate');
  for (const change of [{ budgetMYR: -1 }, { learningHours: 0 }, { learningHours: 41 }, { occupation: '' }, { experienceYears: 61 }, { skills: [{ name: 'Bad', level: 6, category: 'Demo' }] }]) {
    assert.equal(profileSchema.safeParse({ ...profile, ...change }).success, false);
  }
});
test('synthetic aggregates and SDG mappings do not imply universal impact', () => {
  assert.equal(aggregateRecords.length, 12);
  assert.equal(sdgGoals.length, 17);
  assert.equal(new Set(sdgGoals.map(s => s.number)).size, 17);
  assert.ok(sdgMappings.length < sdgGoals.length);
  assert.ok(sdgMappings.every(m => !m.verified && m.citationUrl === null));
  assert.ok(evidenceWarnings(demoRoles[0].evidence).some(w => w.includes('Synthetic')));
  assert.ok(evidenceWarnings(demoRoles[0].evidence, new Date('2027-04-01')).some(w => w.includes('stale')));
});
test('aggregate gap heatmap includes missing required skills and excludes non-applicable records', () => {
  const records = [
    { id: 'a', group: 'Demo', programme: 'Demo', skills: [], targetRoleId: 'service-designer' },
    { id: 'b', group: 'Demo', programme: 'Demo', skills: [], targetRoleId: 'learning-partner' },
  ];
  assert.deepEqual(meanSkillGap(records, 'Service blueprinting'), { meanGap: 3, recordCount: 1 });
  assert.deepEqual(meanSkillGap(records, 'Facilitation'), { meanGap: 3, recordCount: 2 });
  assert.deepEqual(meanSkillGap(records, 'AI literacy'), { meanGap: null, recordCount: 0 });
  assert.throws(() => meanSkillGap([{ ...records[0], targetRoleId: 'invalid' }], 'Excel'), /unknown/);
});
