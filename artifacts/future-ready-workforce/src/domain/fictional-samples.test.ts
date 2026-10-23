import test from 'node:test';
import assert from 'node:assert/strict';
import { pathwaySamples, fictionalProfile, sampleCvText } from './pathway-samples';
import { defaultWorkspace, parseWorkspace, profileSchema } from './storage';
test('four labelled fictional profiles and CVs include constraints and no demographic scoring inputs', () => {
  assert.equal(pathwaySamples.length, 4);
  for (const sample of pathwaySamples) {
    const original = defaultWorkspace().profiles.adult;
    const before = JSON.stringify(original);
    const profile = fictionalProfile(original, sample.id);
    assert.ok(profileSchema.safeParse(profile).success);
    assert.equal(profile.learningHours, sample.hours);
    assert.equal(profile.budgetMYR, sample.budget);
    assert.ok(profile.skills.every(s => s.level >= 1 && s.level <= 5));
    assert.equal(JSON.stringify(original), before);
    assert.equal('age' in profile, false); assert.equal('gender' in profile, false);
    assert.match(sampleCvText(sample.id), /FICTIONAL SAMPLE CV/);
    assert.ok(sampleCvText(sample.id).startsWith(sample.name));
    const state = defaultWorkspace(); state.profiles.adult = profile;
    assert.deepEqual(parseWorkspace(JSON.stringify(state)).state.profiles.adult, profile);
  }
});
