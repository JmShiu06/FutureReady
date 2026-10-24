import { it } from 'node:test';
import assert from 'node:assert/strict';
import { sampleJobs } from '../../../api-server/src/data/sampleJobs';
import { emptyListingFilters, filterListings, orderListingsByMatch, matchesQuery, readListingSearch, listingSearchParams, listingReturnHref, filterDosmGroups, matchDosmKeyword, groupOccupationOptions, mascoGroupCode, hasSearchCriteria } from './job-listing-filters';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SampleListingBadge, ExternalJobLinks } from '../components/shared/external-job-links';
import { I18nProvider } from '../i18n/i18n-context';

function renderWithI18n(node: React.ReactNode) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: { getItem: () => 'en' } },
  });
  try {
    return renderToStaticMarkup(createElement(I18nProvider, null, node));
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

it('round-trips every listing control and page through detail and return links', () => {
  const state = {
    filters: {
      q: ' Data & nursing + café / 科技 ', occupation: 'occupation-2521', group: '', skill: 'Critical Thinking',
      location: 'Kuala Lumpur', workMode: 'hybrid', level: 'mid', sdg: '9',
    },
    matchOnly: true,
    page: 3,
    submitted: true,
    view: 'dosm' as const,
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
  const defaults = { filters: emptyListingFilters, matchOnly: false, page: 1, submitted: false, view: 'listings' as const };
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
    ...emptyListingFilters, q: job.requiredSkills[0], occupation: job.occupationId, location: job.state!,
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
    const badge = renderWithI18n(createElement(SampleListingBadge, { testId: `badge-${job.id}` }));
    assert.match(badge, /Sample listing \(fictional\)/, job.id);
    const links = renderWithI18n(createElement(ExternalJobLinks, { occupationTitle: job.occupationName, testIdSuffix: job.id }));
    assert.match(links, /See real jobs on LinkedIn/);
    assert.equal((links.match(/target="_blank"/g) ?? []).length, 3);
    assert.equal((links.match(/rel="noopener noreferrer"/g) ?? []).length, 3);
    assert.match(links, /JobStreet Malaysia \(homepage\)/);
    assert.match(links, /MYFutureJobs \(homepage\)/);
    assert.match(links, /links do not verify vacancies or endorse employers/);
    assert.match(links, /open the provider homepage only/);
    assert.match(links, /a title-specific search could not be confirmed/);
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

const groups = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
  code: String(n), label: `Group ${n}`, employedThousands: 100 + n * 7.3, generalSkills: n === 9 ? ['Rare Skill'] : [],
  skillSourceUrls: [], skillsCoverage: '', matchedOccupationTitles: [], matchedJobTitles: [],
}));

it('submitted/results-tab state round-trips, old q URLs count as searched, and reset clears everything', () => {
  assert.equal(readListingSearch('tab=listings').submitted, false);
  assert.equal(readListingSearch('tab=listings&q=data').submitted, true);
  assert.equal(readListingSearch('occupation=x').submitted, true);
  const blank = { filters: emptyListingFilters, matchOnly: false, page: 1, submitted: true, view: 'listings' as const };
  assert.equal(listingSearchParams(blank).toString(), 'tab=listings&submitted=1');
  assert.deepEqual(readListingSearch(listingSearchParams(blank)), blank);
  const grouped = { ...blank, filters: { ...emptyListingFilters, group: '2', skill: 'Writing' }, view: 'dosm' as const };
  assert.deepEqual(readListingSearch(listingSearchParams(grouped)), grouped);
  assert.equal(readListingSearch('group=12').filters.group, '');
  assert.equal(readListingSearch('group=2&occupation=o').filters.group, '');
  assert.equal(listingReturnHref('q=data&results=dosm&skill=Writing&profile=secret'), '/careers-and-jobs?tab=listings&q=data&skill=Writing&results=dosm');
  assert.equal(hasSearchCriteria(emptyListingFilters, false), false);
});

it('group and skill filters narrow samples by MASCO first digit and exact skill names', () => {
  const g = mascoGroupCode(sampleJobs[0].mascoCode)!;
  const byGroup = filterListings(sampleJobs, { ...emptyListingFilters, group: g });
  assert.ok(byGroup.length > 0 && byGroup.every(j => j.mascoCode[0] === g));
  const skill = sampleJobs[0].requiredSkills[0];
  const bySkill = filterListings(sampleJobs, { ...emptyListingFilters, skill });
  assert.ok(bySkill.length > 0 && bySkill.every(j => j.requiredSkills.includes(skill)));
  assert.equal(filterListings(sampleJobs, { ...emptyListingFilters, skill: skill.toLowerCase() }).length, 0);
  assert.equal(mascoGroupCode('Data scenario'), null);
  assert.equal(mascoGroupCode('25'), null);
  const options = groupOccupationOptions([...sampleJobs, { ...sampleJobs[0], occupationId: 'synthetic', occupationName: 'Scenario', mascoCode: 'n/a' }], { [g]: 'Professionals' });
  assert.equal(options.at(-1)!.code, null);
  assert.deepEqual(options.at(-1)!.occupations.map(o => o.id), ['synthetic']);
  assert.ok(options.find(o => o.code === g)!.label === 'Professionals');
});

it('DOSM groups follow shared filters, ignore sample-only scope and never change counts', () => {
  const before = JSON.stringify(groups);
  const job = sampleJobs.find(j => j.sdgTags.length)!;
  const code = mascoGroupCode(job.mascoCode)!;
  const opts = (f: object, matchOnly = false, scores?: Map<string, never>) => ({ filters: { ...emptyListingFilters, ...f }, matchOnly, scores });
  assert.deepEqual(filterDosmGroups(groups, sampleJobs, opts({ group: '3' })).map(g => g.code), ['3']);
  assert.deepEqual(filterDosmGroups(groups, sampleJobs, opts({ occupation: job.occupationId })).map(g => g.code), [code]);
  assert.equal(filterDosmGroups(groups, sampleJobs, opts({ location: 'Nowhere', workMode: 'remote', level: 'senior' })).length, 9);
  assert.ok(filterDosmGroups(groups, sampleJobs, opts({ skill: 'Rare Skill' })).some(g => g.code === '9'));
  assert.ok(filterDosmGroups(groups, sampleJobs, opts({ skill: job.requiredSkills[0] })).some(g => g.code === code));
  assert.ok(filterDosmGroups(groups, sampleJobs, opts({ sdg: String(job.sdgTags[0]) })).every(g => sampleJobs.some(j => j.mascoCode[0] === g.code && j.sdgTags.includes(job.sdgTags[0]))));
  const scores = new Map([[job.id, { jobId: job.id, score: 33.3, matchedSkills: [], missingSkills: [], skillsConsidered: 6 }]]);
  assert.deepEqual(filterDosmGroups(groups, sampleJobs, { filters: emptyListingFilters, matchOnly: true, scores }).map(g => g.code), [code]);
  const kw = matchDosmKeyword(groups, [], sampleJobs, 'data');
  assert.ok(kw.length > 0 && kw.every(g => g.matchedVia.length > 0));
  assert.ok(matchDosmKeyword(groups, [], sampleJobs, '2521').some(g => g.code === '2' && g.matchedVia.includes('MASCO code')));
  assert.equal(matchDosmKeyword(groups, null, sampleJobs, '').length, 9);
  for (const g of kw) assert.equal(g.employedThousands, groups.find(x => x.code === g.code)!.employedThousands);
  assert.equal(JSON.stringify(groups), before);
});
