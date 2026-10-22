import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mycolSdgMappings, sdgMappings } from '@workspace/workforce-evidence';
import { mycolOccupations, mycolSource } from '../data/occupation-evidence/mycol-2024-2025';
import { occupationMappings } from '../data/occupation-evidence/masco-onet-mapping';
import { AiContextError, prepareAiContext } from './aiEvidence';

it('limits MyCOL SDG relevance to reviewed nursing and HR duties, not every critical occupation', () => {
  assert.deepEqual(mycolSdgMappings.map(m => [m.roleId, m.goal, m.target]), [
    ['mycol-2221', 3, '3.8'], ['mycol-1212', 8, '8.8'],
  ]);
  assert.equal(new Set(mycolSdgMappings.map(m => `${m.roleId}:${m.goal}`)).size, mycolSdgMappings.length);
  for (const m of mycolSdgMappings) {
    const masco = m.roleId.replace('mycol-', '');
    const occupation = mycolOccupations.find(o => o.masco4 === masco);
    const crosswalk = occupationMappings.find(o => o.masco4 === masco);
    assert.ok(occupation);
    assert.equal(crosswalk?.status, 'verified');
    assert.equal(m.status, 'source-supported');
    assert.equal(Number(m.target.split('.')[0]), m.goal);
    assert.equal(m.reviewedAt, '2026-10-22');
    assert.deepEqual(m.skills, [], 'duty evidence must not invent skill requirements');
    assert.match(m.explanation, /not (evidence|proof)/i);
    assert.match(m.scope, /US/);
    assert.equal(m.sourceDate, '2015-09-25');
    assert.equal(m.sourceUrl, 'https://docs.un.org/en/A/RES/70/1');
    assert.deepEqual(m.citations.map(c => c.kind), ['UN target', 'Occupational duties', 'MyCOL scope']);
    const [un, duties, scope] = m.citations;
    assert.equal(un.url, `https://sdgs.un.org/goals/goal${m.goal}`);
    assert.match(un.observation, new RegExp(`Target ${m.target.replace('.', '\\.')}`));
    assert.equal(duties.url, `https://www.onetonline.org/link/summary/${crosswalk!.onetSocCode}#Tasks`);
    assert.equal(scope.url, mycolSource.reportUrl);
    assert.ok(scope.title.includes(`p. ${occupation.profilePage}`));
    assert.ok(scope.observation.includes(masco));
    for (const c of m.citations) {
      assert.ok(c.observation.length > 50);
      assert.match(c.accessedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(c.publishedAt, null, 'do not infer a publication date from an access date or edition');
      assert.ok(c.accessedAt <= m.reviewedAt);
    }
    assert.equal('impactScore' in m, false);
    assert.equal('score' in m, false);
  }
  const assessed = new Set(mycolSdgMappings.map(m => m.roleId));
  for (const masco of ['2413', '2431', '2511', '2512', '2521', '2524', '2531']) {
    assert.equal(assessed.has(`mycol-${masco}`), false);
  }
  assert.match(mycolSdgMappings[0].scope, /Nurse Instructor/);
  assert.match(mycolSdgMappings[1].scope, /Training Manager/);
});

it('preserves sample mappings and never routes MyCOL evidence through the synthetic-only goal API', async () => {
  assert.deepEqual(sdgMappings.map(m => [m.roleId, m.status]), [
    ['learning-partner', 'source-supported'], ['workforce-analyst', 'unverified'],
    ['service-designer', 'source-supported'], ['ai-operations', 'unverified'],
  ]);
  for (const goal of [3, 8]) {
    await assert.rejects(
      prepareAiContext({ feature: 'sdg-contribution', sampleId: 'data-starter', goal }),
      e => e instanceof AiContextError && e.status === 422,
    );
  }
});
