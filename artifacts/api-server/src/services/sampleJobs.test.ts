import { it } from 'node:test';
import assert from 'node:assert/strict';
import { sampleJobs } from '../data/sampleJobs';
import { DemoJobProvider } from './job_provider';
import { occupationEvidence, matchOccupations } from '../lib/occupationEvidence';
import { fictionalListingLabel, externalJobSearchLinks, mycolSdgMappings, sdgMappings, roleSdgUseCases } from '@workspace/workforce-evidence';
import { readFileSync } from 'node:fs';

it('provides 39 fictional examples covering every reviewed MyCOL occupation and all existing scenario roles', () => {
  assert.equal(sampleJobs.length, 39);
  assert.equal(new Set(sampleJobs.map(j => j.id)).size, sampleJobs.length);
  for (const occupation of occupationEvidence.mycol)
    assert.ok(sampleJobs.filter(j => j.occupationId === `mycol-${occupation.masco4}`).length >= 3, occupation.title);
  for (const role of ['service-designer', 'workforce-analyst', 'learning-partner', 'ai-operations'])
    assert.equal(sampleJobs.filter(j => j.sdgRoleId === role).length, 3);
});

it('every sample has fictional labelling, no salary or fake application link, documented skills and unchanged reviewed mappings', () => {
  const references = matchOccupations([]).occupations;
  for (const job of sampleJobs) {
    assert.equal(job.demo, true, job.id);
    assert.ok(job.company.endsWith('(fictional)'), job.id);
    assert.ok(job.description.includes(fictionalListingLabel), job.id);
    assert.equal(job.externalUrl, null);
    assert.equal(job.salaryMin, null);
    assert.equal(job.salaryMax, null);
    assert.ok(job.requiredSkills.length >= 3 && job.requiredSkills.length <= 6);
    assert.ok(job.city && job.state);
    assert.equal(job.remote, job.workMode === 'remote');
    const reference = references.find(o => o.mycol.masco4 === job.mascoCode)!;
    assert.equal(job.onetCode, reference.onet.code);
    assert.equal(job.mappingStatus, reference.mapping.status);
    if (job.mappingStatus === 'unverified') {
      assert.equal(reference.recommendationStatus, 'excluded');
      assert.match(job.mappingNote, /Unverified crosswalk/);
    }
    const vocabulary = new Set(Object.values(occupationEvidence.onet.occupations).flatMap(o => o.skills.map(s => s.name)));
    assert.ok(job.requiredSkills.every(skill => vocabulary.has(skill)));
    if (job.mascoCode === '2413') {
      assert.equal(reference.documentedSkills.length, 0);
      assert.equal(reference.overlap, null);
      assert.match(job.mappingNote, /not verified occupational requirements/);
    } else assert.ok(job.requiredSkills.every(skill => reference.documentedSkills.some(s => s.name === skill)));
    const mappings = [...mycolSdgMappings, ...sdgMappings].filter(m => m.roleId === job.sdgRoleId);
    const existingCase = roleSdgUseCases[job.sdgRoleId];
    const expected = mappings.length ? mappings.map(m => m.goal) : existingCase ? [existingCase.goal] : [];
    assert.deepEqual(job.sdgTags, [...new Set(expected)]);
    const linkedin = new URL(externalJobSearchLinks(job.occupationName)[0].url);
    assert.equal(linkedin.searchParams.get('keywords'), job.occupationName);
    assert.equal(linkedin.searchParams.get('location'), 'Malaysia');
    assert.equal(linkedin.pathname, '/jobs/search/');
  }
});


it('searches data, nurse, cyber, occupation names, MASCO codes and O*NET skills across the complete catalogue', async () => {
  const provider = new DemoJobProvider();
  for (const q of ['data', 'nurse', 'cyber', '2521', 'Nursing Professionals', 'Critical Thinking']) {
    const result = await provider.listJobs({ q, page: 1, limit: 50, sort: 'relevance' });
    assert.ok(result.total >= 3, q);
  }
});

it('keeps the original exact-normalized match formula and denominator for all sample requirements', async () => {
  const provider = new DemoJobProvider();
  for (const job of sampleJobs) {
    const selected = job.requiredSkills.slice(0, 4).map(s => `  ${s.toUpperCase().replace(/ /g, '   ')} `);
    const [score] = await provider.matchJobs(selected, [job.id]);
    assert.equal(score.score, Math.round(4 / job.requiredSkills.length * 100));
    assert.deepEqual(score.matchedSkills, job.requiredSkills.slice(0, 4));
    assert.equal(score.skillsConsidered, job.requiredSkills.length);
  }
});

it('card and detail UI use the fictional badge and external search control, not application links', () => {
  // Source-wiring regression check complements catalogue invariants and actual UI previews.
  for (const file of ['job-search-page.tsx', 'job-details-page.tsx']) {
    const source = readFileSync(new URL(`../../../future-ready-workforce/src/components/${file}`, import.meta.url), 'utf8');
    assert.match(source, /SampleListingBadge/);
    assert.match(source, /ExternalJobLinks/);
    assert.doesNotMatch(source, /No application link in demo data|Open application|job\.externalUrl/);
  }
});
