import { it } from 'node:test';
import assert from 'node:assert/strict';
import { sampleJobs } from '../../../api-server/src/data/sampleJobs';
import { emptyListingFilters, filterListings, orderListingsByMatch, matchesQuery, readListingSearch, listingSearchParams, listingReturnHref } from './job-listing-filters';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SampleListingBadge, ExternalJobLinks } from '../components/shared/external-job-links';

it('round-trips every listing control and page through detail and return links', () => {
  const state = {
    filters: {
      q: ' Data & nursing + café / 科技 ', occupation: 'occupation-2521',
      location: 'Kuala Lumpur', workMode: 'hybrid', level: 'mid', sdg: '9',
    },
    matchOnly: true,
    page: 3,
  };
  const search = listingSearchParams(state).toString();
  const detail = new URL(`/careers-and-jobs/listings/sample-1?${search}`, 'https://example.test');
  const back = new URL(listingReturnHref(detail.search), detail);
  assert.equal(back.pathname, '/careers-and-jobs');
  assert.equal(back.searchParams.get('tab'), 'listings');
  assert.deepEqual(readListingSearch(detail.search), state);
  assert.deepEqual(readListingSearch(back.search), state);
  // The listing URL remains a complete source of state for browser Back and reload.
  assert.deepEqual(readListingSearch(search), state);
});

it('default and reset URLs clear filters, matching and pagination without retaining profile data', () => {
  const defaults = { filters: emptyListingFilters, matchOnly: false, page: 1 };
  assert.deepEqual(readListingSearch(''), defaults);
  assert.equal(listingReturnHref(''), '/careers-and-jobs?tab=listings');
  assert.equal(listingSearchParams(defaults).toString(), 'tab=listings');
  const incoming = 'tab=listings&q=data&page=2&candidateSkills=PrivateSkill&scores=99&returnTo=https://evil.test';
  const returned = listingReturnHref(incoming);
  assert.equal(returned, '/careers-and-jobs?tab=listings&q=data&page=2');
  const withExtraFields = { ...defaults, candidateSkills: ['PrivateSkill'], scores: [99] };
  assert.equal(listingSearchParams(withExtraFields).toString(), 'tab=listings');
});

it('rejects malformed page state and treats only the explicit match flag as enabled', () => {
  for (const value of ['', '0', '-1', '1.5', 'NaN', 'Infinity', '2foo', '9007199254740992']) {
    assert.equal(readListingSearch(`page=${value}`).page, 1, value);
  }
  assert.equal(readListingSearch('page=4').page, 4);
  assert.equal(readListingSearch('matchOnly=true').matchOnly, false);
  assert.equal(readListingSearch('matchOnly=1').matchOnly, true);
});

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
