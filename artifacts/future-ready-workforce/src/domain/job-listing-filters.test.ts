import { it } from 'node:test';
import assert from 'node:assert/strict';
import { sampleJobs } from '../../../api-server/src/data/sampleJobs';
import { emptyListingFilters, filterListings, orderListingsByMatch, matchesQuery } from './job-listing-filters';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SampleListingBadge, ExternalJobLinks } from '../components/shared/external-job-links';

it('finds several data, nurse and cyber samples plus occupation names, MASCO codes and skill names', () => {
  for (const q of ['data', 'nurse', 'cyber', '2521', 'Nursing Professionals', 'Critical Thinking'])
    assert.ok(filterListings(sampleJobs, { ...emptyListingFilters, q }).length >= 3, q);
  const job = sampleJobs[0];
  assert.ok(matchesQuery(job, job.occupationName.toUpperCase()));
  assert.ok(matchesQuery(job, ` ${job.mascoCode} `));
});

it('combines every requested filter without mutating the catalogue or any scores', () => {
  const original = JSON.stringify(sampleJobs);
  const job = sampleJobs.find(j => j.sdgTags.length && j.workMode === 'remote')!;
  const filtered = filterListings(sampleJobs, {
    q: job.requiredSkills[0], occupation: job.occupationId, location: job.state!,
    workMode: job.workMode, level: job.level, sdg: String(job.sdgTags[0]),
  });
  assert.ok(filtered.some(j => j.id === job.id));
  assert.ok(filtered.every(j => j.occupationId === job.occupationId && j.state === job.state
    && j.workMode === job.workMode && j.level === job.level && j.sdgTags.includes(job.sdgTags[0])));
  assert.equal(filterListings(sampleJobs, { ...emptyListingFilters, q: 'no such fictional occupation' }).length, 0);
  assert.equal(JSON.stringify(sampleJobs), original);
});

it('renders the fictional badge and safe external searches for every sample listing', () => {
  for (const job of sampleJobs) {
    const badge = renderToStaticMarkup(createElement(SampleListingBadge, { testId: `badge-${job.id}` }));
    assert.match(badge, /Sample listing \(fictional\)/, job.id);
    const links = renderToStaticMarkup(createElement(ExternalJobLinks, { occupationTitle: job.occupationName, testIdSuffix: job.id }));
    assert.match(links, /See real jobs on LinkedIn/);
    assert.equal((links.match(/target="_blank"/g) ?? []).length, 3);
    assert.equal((links.match(/rel="noopener noreferrer"/g) ?? []).length, 3);
    assert.match(links, /JobStreet Malaysia \(homepage\)/);
    assert.match(links, /MYFutureJobs \(homepage\)/);
    assert.match(links, /doesn&#x27;t list, verify or apply for real vacancies/);
    assert.doesNotMatch(links, /No application link|Open application|\/apply/);
  }
});

it('matches my skills uses server scores globally before pagination and excludes zero/missing scores', () => {
  const scores = new Map(sampleJobs.map((job, i) => [job.id, {
    jobId: job.id, score: i, matchedSkills: [], missingSkills: [], skillsConsidered: 6,
  }]));
  const original = sampleJobs.map(j => j.id);
  const sorted = orderListingsByMatch(sampleJobs, scores);
  assert.equal(sorted.length, 38);
  assert.equal(sorted.slice(0, 12)[0].id, sampleJobs[38].id);
  assert.equal(sorted.slice(0, 12)[11].id, sampleJobs[27].id);
  assert.deepEqual(sampleJobs.map(j => j.id), original);
  assert.equal(orderListingsByMatch(sampleJobs, new Map()).length, 0);
});
