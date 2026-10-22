import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOccupationSources, matchOccupations } from '../../../api-server/src/lib/occupationEvidence';
import { defaultWorkspace, parseWorkspace } from './storage';
import { documentedOverlap, occupationSnapshot, officialMilestones, officialPlanId } from './official-roadmap';
import { activeBaseline, clearPlanData, confirmSkillUpdate, roadmapMilestones, setMilestoneComplete, startRoadmap } from './learning';
import { completionKey } from './services';
import type { OccupationEvidenceResult } from '@workspace/api-client-react';
import type { Audience, OfficialRoadmapOccupation } from './types';

const evidence = {
  ...matchOccupations([]), sources: getOccupationSources(),
  selectionRule: 'Selected O*NET skills with importance at least 3, excluding suppressed importance and not-relevant levels.',
  scoring: 'Exact normalized documented skill name overlap.',
} as OccupationEvidenceResult;
const eligible = evidence.occupations.filter(o => o.recommendationStatus === 'eligible');
const snapshot = occupationSnapshot(eligible[0], evidence);
const id = officialPlanId(snapshot.id);
const begin = (audience: Audience = 'adult') => {
  const state = defaultWorkspace();
  state.audience = audience;
  return startRoadmap(state, id, new Date('2026-10-22T00:00:00Z'), snapshot);
};

test('all eligible official occupation snapshots persist and preserve exact documented overlap formula', () => {
  for (const occupation of eligible) {
    const snapshot = occupationSnapshot(occupation, evidence);
    const names = occupation.documentedSkills.slice(0, 2).map(s => s.name);
    const actual = matchOccupations(names).occupations.find(o => o.id === occupation.id)!;
    const skills = names.map(name => ({ name: ` ${name.toUpperCase()} `, category: 'Manual', level: 1 as const }));
    assert.equal(documentedOverlap(skills, snapshot).score, actual.overlap!.score);
    let state = defaultWorkspace();
    state.profiles.adult.skills = skills.map(s => ({ ...s, name: s.name.trim() }));
    state = startRoadmap(state, officialPlanId(occupation.id), new Date(), snapshot);
    const restored = parseWorkspace(JSON.stringify(state));
    assert.equal(restored.warning, '');
    assert.deepEqual(restored.state, state);
    assert.equal(roadmapMilestones(state).length, snapshot.documentedSkills.length - names.length);
  }
  for (const excluded of evidence.occupations.filter(o => o.recommendationStatus === 'excluded')) {
    assert.throws(() => occupationSnapshot(excluded, evidence), /reviewed/);
  }
});

test('sample plans, milestones, confirmations and baselines survive official build and resume', () => {
  let state = startRoadmap(defaultWorkspace(), 'service-designer');
  const sampleMilestone = roadmapMilestones(state)[0];
  state = setMilestoneComplete(state, completionKey('adult', sampleMilestone.id), true);
  state = confirmSkillUpdate(state, { milestoneId: sampleMilestone.id, toLevel: 1 }).state;
  const sampleBaseline = activeBaseline(state);
  const previous = state;
  state = startRoadmap(state, id, new Date(), snapshot);
  assert.deepEqual(state.profiles, previous.profiles);
  assert.deepEqual(state.completion, previous.completion);
  assert.deepEqual(state.confirmations, previous.confirmations);
  const officialStart = activeBaseline(state);
  state = parseWorkspace(JSON.stringify(state)).state;
  state = startRoadmap(state, 'service-designer');
  assert.deepEqual(activeBaseline(state), sampleBaseline);
  assert.equal(state.completion[completionKey('adult', sampleMilestone.id)], true);
  state = startRoadmap(state, id);
  assert.deepEqual(activeBaseline(state), officialStart);
});

test('official completion is not proficiency; confirmation applies once and cannot remove baseline milestones', () => {
  let state = begin();
  const milestones = roadmapMilestones(state);
  const milestone = milestones[0];
  const key = completionKey('adult', milestone.id);
  assert.ok(confirmSkillUpdate(state, { milestoneId: milestone.id, toLevel: 1 }).error);
  const before = state.profiles;
  state = setMilestoneComplete(state, key, true);
  assert.deepEqual(state.profiles, before);
  assert.equal(documentedOverlap(state.profiles.adult.skills, snapshot).matched, 0);
  state = confirmSkillUpdate(state, { milestoneId: milestone.id, toLevel: 1 }).state;
  assert.equal(documentedOverlap(state.profiles.adult.skills, snapshot).matched, 1);
  assert.deepEqual(roadmapMilestones(state), milestones);
  assert.ok(confirmSkillUpdate(state, { milestoneId: milestone.id, toLevel: 2 }).error);
  const restored = parseWorkspace(JSON.stringify(state));
  assert.equal(restored.warning, '');
  assert.deepEqual(restored.state, state);
  assert.equal(setMilestoneComplete(state, key, true), state);
});

test('official targets and resets remain isolated for all four audiences', () => {
  let state = begin();
  for (const audience of ['graduate', 'hr', 'education'] as const) {
    state = startRoadmap({ ...state, audience }, id, new Date(), snapshot);
  }
  state = { ...state, audience: 'adult' };
  const milestone = roadmapMilestones(state)[0];
  state = setMilestoneComplete(state, completionKey('adult', milestone.id), true);
  const changed = confirmSkillUpdate(state, { milestoneId: milestone.id, toLevel: 1 }).state;
  for (const audience of ['graduate', 'hr', 'education'] as const) {
    assert.deepEqual(changed.profiles[audience].skills, state.profiles[audience].skills);
    assert.equal(changed.completion[completionKey(audience, milestone.id)], undefined);
  }
  const cleared = clearPlanData(changed, 'adult');
  assert.equal(Object.keys(cleared.baselines).length, 3);
  assert.equal(cleared.confirmations.length, 0);
  assert.equal(parseWorkspace(JSON.stringify(changed)).warning, '');
});

test('unavailable courses have no invented costs, durations or broad skill substitutions', () => {
  const milestones = roadmapMilestones(begin());
  assert.ok(milestones.length);
  for (const milestone of milestones) {
    assert.equal(milestone.verifiedUrl, null);
    assert.equal(milestone.costMYR, null);
    assert.equal(milestone.durationHours, null);
    assert.equal(milestone.synthetic, false);
  }
  // Exercise catalogue compatibility without claiming that O*NET documents these technical labels.
  const technical: OfficialRoadmapOccupation = { ...snapshot, documentedSkills: [
    { elementId: 'test.python', name: 'Python', importance: 3, level: 4, levelLowPrecision: false },
    { elementId: 'test.programming', name: 'Programming', importance: 4, level: 4, levelLowPrecision: false },
  ] };
  const resources = officialMilestones({ skills: [], startedAt: '', occupation: technical });
  assert.equal(resources.find(m => m.skill === 'Python')!.verifiedUrl, 'https://www.netacad.com/courses/python-essentials-1?courseLang=en-US');
  assert.equal(resources.find(m => m.skill === 'Python')!.durationHours, 30);
  assert.equal(resources.find(m => m.skill === 'Programming')!.verifiedUrl, null);
});

test('invalid snapshots recover safely without affecting valid sample plans or audience targets', () => {
  const state = begin();
  state.baselines['graduate:workforce-analyst'] = { skills: [], startedAt: new Date().toISOString() };
  const raw = JSON.parse(JSON.stringify(state));
  raw.baselines[`adult:${id}`].occupation.sourceUrl = 'javascript:alert(1)';
  const restored = parseWorkspace(JSON.stringify(raw));
  assert.ok(restored.warning);
  assert.equal(restored.state.targets.adult, 'service-designer');
  assert.ok(restored.state.baselines['graduate:workforce-analyst']);
  assert.throws(() => startRoadmap(defaultWorkspace(), id), /reviewed/);
});
