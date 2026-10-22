import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateRecords, blankProfile, demoRoles, isLegacySeededSkills, mergeCvSkills, migrateLegacySkills, sampleProfile, sdgGoals, sdgMappings } from './demo-data.ts';
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
  assert.deepEqual(recovered.state.profiles.adult, blankProfile('adult'));
});
test('storage round trip preserves all audience profiles, targets and per-audience completion', () => {
  const state = defaultWorkspace();
  state.audience = 'education';
  state.profiles.hr.budgetMYR = 800;
  state.completion['adult:service-designer:facilitation'] = true;
  // Legacy progress without a starting snapshot gets one on load (covered in the roadmap tests).
  state.baselines['adult:service-designer'] = { skills: state.profiles.adult.skills, startedAt: new Date(0).toISOString() };
  assert.deepEqual(parseWorkspace(JSON.stringify(state)).state, state);
});
test('fresh profiles are blank and storage parsing preserves valid data before the app applies its refresh policy', () => {
  const workspace = defaultWorkspace();
  for (const audience of ['adult', 'graduate', 'hr', 'education'] as const) {
    const profile = workspace.profiles[audience];
    assert.equal(profile.occupation, '');
    assert.equal(profile.experienceYears, null);
    assert.equal(profile.education, '');
    assert.equal(profile.qualification, '');
    assert.equal(profile.studyField, '');
    assert.deepEqual(profile.interests, []);
    assert.equal(profile.location, '');
    assert.equal(profile.workPreference, '');
    assert.equal(profile.learningHours, null);
    assert.equal(profile.budgetMYR, null);
    assert.equal(profile.goals, '');
  }

  const savedProfile = sampleProfile('adult');
  workspace.profiles.adult = savedProfile;
  assert.deepEqual(parseWorkspace(JSON.stringify(workspace)).state.profiles.adult, savedProfile);
});
test('storage failures are visible, not thrown or silently reported as saved', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.ok(loadWorkspace(broken).warning.includes('unavailable'));
  assert.ok(persistWorkspace(broken, defaultWorkspace()).includes('Could not save'));
});
test('blank About You values are valid while numeric and skill bounds remain enforced', () => {
  const profile = sampleProfile('graduate');
  assert.equal(profileSchema.safeParse(blankProfile('graduate')).success, true);
  for (const change of [{ budgetMYR: -1 }, { learningHours: 0 }, { learningHours: 41 }, { experienceYears: 61 }, { skills: [{ name: 'Bad', level: 6, category: 'Demo' }] }]) {
    assert.equal(profileSchema.safeParse({ ...profile, ...change }).success, false);
  }
});
test('SDG mappings distinguish source-supported relevance from unverified examples', () => {
  assert.equal(aggregateRecords.length, 12);
  assert.equal(sdgGoals.length, 17);
  assert.equal(new Set(sdgGoals.map(s => s.number)).size, 17);
  assert.ok(sdgMappings.length < sdgGoals.length);
  const supported = sdgMappings.filter(mapping => mapping.status === 'source-supported');
  const unverified = sdgMappings.filter(mapping => mapping.status === 'unverified');
  assert.deepEqual(supported.map(mapping => mapping.goal).sort((a, b) => a - b), [4, 10]);
  assert.ok(supported.every(mapping =>
    mapping.sourceTitle?.includes('2030 Agenda') &&
    mapping.sourceUrl === 'https://docs.un.org/en/A/RES/70/1' &&
    mapping.sourceDate === '2015-09-25' &&
    Boolean(mapping.sourceObservation),
  ));
  assert.ok(unverified.length > 0);
  assert.ok(unverified.every(mapping =>
    mapping.sourceTitle === null && mapping.sourceUrl === null &&
    mapping.sourceDate === null && mapping.sourceObservation === null,
  ));
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

import { clearPlanData, confirmSkillUpdate, progressReport, roadmapMilestones, setMilestoneComplete, startRoadmap } from './learning.ts';
const started = () => {
  const s = defaultWorkspace();
  s.profiles.adult = { ...sampleProfile('adult'), skills: [{ name: 'Customer research', level: 2, category: 'Demo' }] };
  return startRoadmap(s, 'service-designer', new Date('2026-01-01T00:00:00Z'));
};
const keyOf = (s: ReturnType<typeof started>, i = 0) => completionKey(s.audience, roadmapMilestones(s)[i].id);

test('exploring does not change the target; only startRoadmap does, and it keeps the first baseline', () => {
  const s = defaultWorkspace();
  assert.equal(roadmapMilestones(s).length, 0);
  const a = startRoadmap(s, 'workforce-analyst');
  assert.equal(a.targets.adult, 'workforce-analyst');
  const b = startRoadmap({ ...a, profiles: { ...a.profiles, adult: { ...a.profiles.adult, skills: sampleProfile('adult').skills } } }, 'workforce-analyst');
  assert.deepEqual(b.baselines['adult:workforce-analyst'], a.baselines['adult:workforce-analyst']);
  assert.throws(() => startRoadmap(s, 'nope'));
});
test('milestone completion is idempotent, persisted with a time, reversible, and never changes skill levels', () => {
  const s = started(); const key = keyOf(s);
  const done = setMilestoneComplete(s, key, true, new Date('2026-02-01T00:00:00Z'));
  assert.equal(setMilestoneComplete(done, key, true), done);
  assert.deepEqual(done.profiles, s.profiles);
  assert.ok(done.completedAt[key]);
  const reopened = setMilestoneComplete(done, key, false);
  assert.equal(reopened.completion[key], undefined);
  assert.equal(setMilestoneComplete(s, 'adult:bogus:key', true), s);
  const other = startRoadmap(done, 'workforce-analyst');
  assert.equal(other.completion[key], true);
});
test('confirmation requires completion, applies once, and keeps milestones and progress stable', () => {
  let s = started(); const m = roadmapMilestones(s)[0]; const key = keyOf(s);
  assert.ok(confirmSkillUpdate(s, { milestoneId: m.id, toLevel: 3 }).error);
  s = setMilestoneComplete(s, key, true);
  const before = progressReport(s)!;
  const total = roadmapMilestones(s).length;
  const r = confirmSkillUpdate(s, { milestoneId: m.id, toLevel: 3 });
  assert.equal(r.error, undefined);
  assert.equal(r.state.confirmations.length, 1);
  assert.equal(roadmapMilestones(r.state).length, total);
  assert.equal(r.state.completion[key], true);
  assert.ok(confirmSkillUpdate(r.state, { milestoneId: m.id, toLevel: 4 }).error);
  const after = progressReport(r.state)!;
  assert.equal(after.start.readiness, before.start.readiness);
  assert.equal(after.changePoints, after.current.readiness - after.start.readiness);
  assert.ok(after.changePoints >= 0);
  assert.ok(confirmSkillUpdate(s, { milestoneId: m.id, toLevel: 99 }).error);
});
test('reset clears only one audience plan data; storage round-trips new fields and migrates legacy progress', () => {
  let s = setMilestoneComplete(started(), keyOf(started()), true);
  s = confirmSkillUpdate(s, { milestoneId: roadmapMilestones(s)[0].id, toLevel: 3 }).state;
  const back = parseWorkspace(JSON.stringify(s));
  assert.equal(back.warning, '');
  assert.deepEqual(back.state.confirmations, s.confirmations);
  assert.deepEqual(back.state.baselines, s.baselines);
  const cleared = clearPlanData({ ...s, baselines: { ...s.baselines, 'graduate:workforce-analyst': s.baselines['adult:service-designer'] } }, 'adult');
  assert.deepEqual(Object.keys(cleared.baselines), ['graduate:workforce-analyst']);
  assert.equal(cleared.confirmations.length, 0);
  const legacy = JSON.stringify({ version: 1, audience: 'adult', profiles: s.profiles, targets: s.targets, completion: s.completion });
  assert.ok(parseWorkspace(legacy).state.baselines['adult:service-designer']);
});

test('blank and default/reset profiles start with no skills', () => {
  for (const a of ['adult', 'graduate', 'hr', 'education'] as const) {
    assert.deepEqual(blankProfile(a).skills, []);
    assert.deepEqual(defaultWorkspace().profiles[a].skills, []);
  }
});
test('only exact legacy seeded skill lists are migrated to empty', () => {
  const seedA = sampleProfile('adult').skills;
  const seedB = sampleProfile('adult', 'data').skills;
  assert.deepEqual(migrateLegacySkills(seedA.map(s => ({ ...s }))), []);
  assert.deepEqual(migrateLegacySkills(seedB.map(s => ({ ...s }))), []);
  const edited = seedA.map((s, i) => i === 0 ? { ...s, level: s.level === 5 ? 4 : s.level + 1 } as typeof s : s);
  assert.equal(migrateLegacySkills(edited), edited);
  const extraManual = [...seedA, { name: 'Welding', level: 2 as const, category: 'Custom' }];
  assert.equal(migrateLegacySkills(extraManual), extraManual);
  const cvMarked = seedA.map(s => ({ ...s, cvDetected: true }));
  assert.equal(isLegacySeededSkills(cvMarked), false);
  assert.equal(migrateLegacySkills(cvMarked), cvMarked);
  const manual = [{ name: 'Excel', level: 2, category: 'Custom' }];
  assert.equal(migrateLegacySkills(manual), manual);
  assert.deepEqual(migrateLegacySkills([]), []);
});
test('applying a new CV keeps manual skills, keeps re-detected CV ratings and drops stale CV skills', () => {
  const current = [
    { name: 'Facilitation', level: 4, category: 'Custom' },
    { name: 'Python', level: 3, category: 'Technical Skills', cvDetected: true },
    { name: 'Excel', level: 2, category: 'CV detected', cvDetected: true },
    { name: 'SQL', level: 5, category: 'Custom' },
  ];
  const imported = [{ name: 'Docker', level: 2, category: 'Technical Skills', cvDetected: true }, { name: 'python', level: 1, category: 'x', cvDetected: true }];
  const result = mergeCvSkills(current, imported, ['Python', 'Docker', 'SQL']);
  assert.deepEqual(result.skills.map(s => [s.name, s.level]), [['Facilitation', 4], ['Python', 3], ['SQL', 5], ['Docker', 2]]);
  assert.deepEqual(result.removed, ['Excel']);
  assert.equal(result.skills.find(s => s.name === 'SQL')?.cvDetected, undefined);
});
