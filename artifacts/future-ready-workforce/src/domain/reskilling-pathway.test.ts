import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseCatalog, type CourseResource } from './resource-catalog';
import { buildPathway, describePlanChanges, priorityFingerprint, selectResource, weeksFor, portfolioMilestoneId, type PathwayInput } from './reskilling-pathway';
import { readPathwayPreferences } from './pathway-preferences';
import { defaultWorkspace, parseWorkspace } from './storage';
import { startSampleRoadmap, setMilestoneComplete, resetActiveRoadmap, confirmSkillUpdate } from './learning';
import { completionKey } from './services';
import type { LearningMilestone, OfficialRoadmapOccupation } from './types';

const occupation: OfficialRoadmapOccupation = {
  id: 'mycol-2512', title: 'Software Developers', edition: 'MyCOL 2024/2025', masco4: '2512',
  onetCode: '15-1252.00', onetTitle: 'Software Developers', sourceUrl: 'https://www.onetonline.org/link/summary/15-1252.00',
  release: '31.0', selectionRule: 'Synthetic test snapshot', mappingLimitations: 'Test only',
  documentedSkills: [
    { name: 'Critical Thinking', elementId: '2.B.2.a', importance: 3, level: 4, levelLowPrecision: false },
    { name: 'Time Management', elementId: '2.B.5.a', importance: 3.5, level: 4, levelLowPrecision: false },
  ],
};
const milestone = (skill: string, id = skill): LearningMilestone => ({
  id, skill, title: 'Unused legacy sample title', provider: 'Unused', verifiedUrl: null,
  synthetic: true, durationHours: null, costMYR: null, prerequisites: [], priority: 'High', order: 1,
});
const input = (skills: string[], extra: Partial<PathwayInput> = {}): PathwayInput => ({
  milestones: skills.map(s => milestone(s)), roleId: 'official:mycol-2512', roleTitle: 'Software Developers',
  occupation, scenario: 'moderate', signals: [], hoursPerWeek: 5, budgetMYR: 0,
  freeOnly: false, now: new Date('2026-10-23T00:00:00Z'), ...extra,
});
/** Explicitly fictional test fixtures; not part of the public course catalogue. */
const fixture = (id: string, skill: string, price: number, cost: CourseResource['cost'] = price ? `Low-cost MYR ${price}` : 'Free'): CourseResource => ({
  id, title: 'Synthetic test fixture — never displayed', provider: 'Test fixture',
  url: 'https://example.invalid/test-only', sourceUrl: 'https://example.invalid/test-only',
  cost, costMYR: price, hours: 1, level: 'Beginner', skills: [skill], sdgs: [4],
  verified_on: '2026-10-23', status: 'verified', coverage: 'Test only', timeBasis: 'Test only', costCaveat: 'Test only',
});

test('foundation comes before core; existing scenario priority reorders core gaps', () => {
  const skills = ['Critical Thinking', 'Time Management', 'Mathematics'];
  const moderate = buildPathway(input(skills));
  const fast = buildPathway(input(skills, { scenario: 'fast' }));
  assert.equal(moderate.steps[0].phase, 'Foundation');
  assert.equal(moderate.steps[0].skill, 'Mathematics');
  assert.deepEqual(moderate.steps.filter(s => s.phase === 'Core skills').map(s => s.skill), ['Time Management', 'Critical Thinking']);
  assert.deepEqual(fast.steps.filter(s => s.phase === 'Core skills').map(s => s.skill), ['Critical Thinking', 'Time Management']);
  assert.equal(fast.steps.at(-1)?.phase, 'Apply it');
});
test('each step rounds weeks up, and total is sequential whole-week allowances', () => {
  const plan = buildPathway(input(['Critical Thinking', 'Systems Analysis'], {
    catalog: [fixture('a', 'Critical Thinking', 0), fixture('b', 'Systems Analysis', 0)],
  }));
  assert.equal(plan.totalHours, 6);
  assert.equal(plan.totalWeeks, 3);
  assert.equal(plan.finishDate, '2026-11-13');
  assert.deepEqual(plan.steps.map(s => s.weeks), [1, 1, 1]);
  assert.equal(weeksFor(6, 5), 2);
  assert.equal(weeksFor(24, 5), 5);
  assert.equal(weeksFor(null, 5), null);
  assert.equal(weeksFor(0, 5), null);
  assert.equal(weeksFor(2, 0), null);
  assert.equal(weeksFor(2, NaN), null);
});
test('selection prefers free content, then free audit, then priced claimable before low-cost', () => {
  const skill = 'Programming';
  const free = fixture('free', skill, 0);
  const audit = fixture('audit', skill, 0, 'Free audit');
  const claim = fixture('claim', skill, 40, 'HRD Corp-claimable');
  const paid = fixture('paid', skill, 20);
  assert.equal(selectResource(skill, [paid, claim, audit, free], 100, false)?.id, 'free');
  assert.equal(selectResource(skill, [paid, claim, audit], 100, false)?.id, 'audit');
  assert.equal(selectResource(skill, [paid, claim], 100, false)?.id, 'claim');
  assert.equal(selectResource(skill, [paid, claim], 100, true), null);
  assert.equal(selectResource(skill, [{ ...claim, costMYR: null }], 100, false), null);
});
test('budget is plan-wide and never invents a free option or counts an unaffordable one', () => {
  const plan = buildPathway(input(['Critical Thinking', 'Systems Analysis'], {
    budgetMYR: 100, catalog: [fixture('a', 'Critical Thinking', 60), fixture('b', 'Systems Analysis', 60)],
  }));
  assert.equal(plan.totalCostMYR, 60);
  assert.equal(plan.unavailableCount, 1);
  assert.equal(plan.unknownDurationCount, 1);
  assert.equal(plan.finishDate, null);
  assert.equal(plan.steps.filter(s => s.status === 'budget').length, 1);
});
test('free-only rejects paid and claimable content even inside the budget', () => {
  const plan = buildPathway(input(['Critical Thinking'], {
    budgetMYR: 100, freeOnly: true, catalog: [fixture('paid', 'Critical Thinking', 30)],
  }));
  assert.equal(plan.steps[0].status, 'budget');
  assert.equal(plan.steps[0].hours, null);
  assert.equal(plan.totalCostMYR, 0);
});
test('one course covering multiple gaps is timed and costed once and retains all milestone IDs', () => {
  const plan = buildPathway(input(['Active Listening', 'Writing']));
  assert.equal(plan.steps.length, 2); // One real course, then one explicit project.
  assert.equal(plan.totalHours, 28);
  assert.equal(plan.totalWeeks, 6);
  assert.equal(plan.steps[0].resource?.id, 'ol-communication');
  assert.deepEqual(plan.steps[0].milestoneIds.sort(), ['Active Listening', 'Writing']);
});
test('unmatched skills remain visible with unknown duration/cost rather than invented courses', () => {
  const plan = buildPathway(input(['Negotiation']));
  assert.equal(plan.steps[0].status, 'no-resource');
  assert.equal(plan.steps[0].resource, null);
  assert.equal(plan.steps[0].hours, null);
  assert.equal(plan.finishDate, null);
  assert.deepEqual(plan.skills, []);
});
test('unconfirmed links use only a provider catalogue and do not imply verified time or cost', () => {
  const providerCatalogue = { ...fixture('catalogue-only', 'Critical Thinking', 0), url: 'https://example.invalid/catalogue', status: 'check-availability' as const, hours: null, costMYR: null };
  const plan = buildPathway(input(['Critical Thinking'], { catalog: [providerCatalogue] }));
  assert.equal(plan.steps[0].status, 'check-availability');
  assert.equal(plan.steps[0].resource?.url, providerCatalogue.url);
  assert.equal(plan.steps[0].weeks, null);
  assert.equal(plan.finishDate, null);
});
test('empty gaps do not fabricate a course or project', () => {
  const plan = buildPathway(input([]));
  assert.equal(plan.steps.length, 0);
  assert.equal(plan.finishDate, null);
});
test('market/scenario changes are describable without mutating the accepted plan or completion', () => {
  const before = buildPathway(input(['Critical Thinking', 'Time Management']));
  const snapshot = JSON.stringify(before);
  const after = buildPathway(input(['Critical Thinking', 'Time Management'], { scenario: 'fast' }));
  assert.notEqual(priorityFingerprint(before), priorityFingerprint(after));
  assert.ok(describePlanChanges(before, after).length);
  assert.equal(JSON.stringify(before), snapshot);
  const signals = [{ group: 'professionals' as const, previous: 100, latest: 200, sourceUrl: '', period: 'Synthetic test' }];
  assert.notEqual(priorityFingerprint(before), priorityFingerprint(buildPathway(input(['Critical Thinking', 'Time Management'], { signals }))));
});
test('samples preserve saved profile; completion, including portfolio, cannot update skills', () => {
  const original = defaultWorkspace();
  const skillsBefore = JSON.stringify(original.profiles);
  let state = startSampleRoadmap(original, occupation, 'it-graduate', new Date('2026-10-23T00:00:00Z'));
  const roleId = state.targets[state.audience];
  const courseId = `${roleId}:2.B.2.a`;
  const projectId = portfolioMilestoneId(roleId);
  state = setMilestoneComplete(state, completionKey(state.audience, courseId), true);
  state = setMilestoneComplete(state, completionKey(state.audience, projectId), true);
  assert.equal(JSON.stringify(state.profiles), skillsBefore);
  assert.equal(state.completion[completionKey(state.audience, projectId)], true);
  assert.ok(confirmSkillUpdate(state, { milestoneId: projectId, toLevel: 2 }).error);
  const restored = parseWorkspace(JSON.stringify(state)).state;
  assert.equal(restored.baselines[`${state.audience}:${roleId}`].sampleLabel, 'Fresh IT graduate');
  assert.equal(restored.completion[completionKey(state.audience, projectId)], true);
  const reset = resetActiveRoadmap(restored);
  assert.equal(reset.completion[completionKey(state.audience, projectId)], undefined);
  assert.equal(reset.completion[completionKey(state.audience, courseId)], undefined);
  assert.deepEqual(reset.profiles, original.profiles);
});
test('resuming a sample never replaces an existing starting snapshot or completion', () => {
  const first = startSampleRoadmap(defaultWorkspace(), occupation, 'it-graduate');
  const next = startSampleRoadmap(first, occupation, 'factory-supervisor');
  assert.equal(next.baselines, first.baselines);
});
test('invalid saved pathway controls recover without consuming or changing workspace data', () => {
  const result = readPathwayPreferences('{"version":1,"hours":0}', 'moderate', []);
  assert.ok(result.warning);
  assert.equal(result.value.hours, 5);
  assert.equal(result.value.budget, 0);
});
test('public catalogue contains reviewed provider metadata and positive stated hours only', () => {
  assert.equal(courseCatalog.length, 6);
  for (const course of courseCatalog) {
    assert.match(course.url, /^https:\/\/(www\.open\.edu|www\.netacad\.com)\//);
    assert.ok(course.hours !== null && course.hours > 0);
    assert.ok(course.coverage && course.sourceUrl && course.skills.length && course.sdgs.length);
    assert.equal(course.verified_on, '2026-10-23');
    assert.equal(course.costMYR, 0);
  }
});
