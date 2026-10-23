import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePathway, type PathwayStep } from './reskilling-pathway';
const step = (id: string, hours: number | null): PathwayStep => ({
  id, milestoneIds: [id], skill: id, coveredSkills: [id], phase: 'Core skills', kind: 'course',
  resource: null, status: 'available', hours, weeks: null, priority: 1, scenarioBonus: 0,
  why: 'Test-only fixture', whyResource: '', sdgs: [4], activity: '', evidenceUrl: null, importance: null,
});
test('74 hours at 11 hours/week takes seven packed weeks with ordered ranges', () => {
  const plan = summarizePathway([step('a', 14), step('b', 60)], 11, new Date('2026-10-23T00:00:00Z'));
  assert.equal(plan.totalWeeks, 7); assert.equal(plan.remainingHours, 74);
  assert.deepEqual(plan.steps.map(s => [s.startWeek, s.endWeek]), [[1, 2], [2, 7]]);
  assert.equal(plan.finishDate, '2026-12-11');
});
test('done hours are excluded, unknown hours unscheduled, grouped course needs all completions', () => {
  const grouped = { ...step('a', 14), milestoneIds: ['a', 'b'] };
  const now = new Date('2026-10-23T00:00:00Z');
  const partial = summarizePathway([grouped, step('unknown', null)], 11, now, ['a']);
  assert.equal(partial.remainingHours, 14); assert.equal(partial.totalWeeks, 2);
  assert.equal(partial.finishDate, null); assert.equal(partial.steps[1].startWeek, undefined);
  const complete = summarizePathway([grouped, step('c', 8)], 11, now, ['a', 'b']);
  assert.equal(complete.totalHours, 22); assert.equal(complete.remainingHours, 8);
  assert.equal(complete.totalWeeks, 1); assert.equal(complete.steps[0].startWeek, undefined);
  assert.equal(complete.steps[1].startWeek, 1);
});
