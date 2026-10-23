import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { Job, JobMatchInput, JobPage, ListJobsParams } from '@workspace/api-client-react';
import { CATALOGUE_PAGE_SIZE, MAX_CATALOGUE_PAGES, loadJobCatalogue, loadJobMatchScores } from './job-catalogue-loading';
import { emptyListingFilters, filterListings, orderListingsByMatch } from './job-listing-filters';

// Entirely fictional, offline fixtures. No profile storage or generation endpoints.
const jobs: Job[] = Array.from({ length: 105 }, (_, index) => ({
  id: `fictional-${index}`, title: index === 104 ? 'Tail-only specialist' : `Fictional role ${index}`,
  company: 'Fictional company', location: 'Fictional location', state: null, city: null,
  remote: true, salaryMin: null, salaryMax: null, employmentType: 'full-time',
  shortDescription: 'Offline fixture', description: 'Offline fixture',
  requiredSkills: index === 104 ? ['Tail skill'] : ['Common skill', 'Other skill'],
  externalUrl: null, datePosted: '2026-01-01', companyInfo: 'Fictional', demo: true,
  occupationId: 'fictional-occupation', occupationName: 'Fictional occupation', mascoCode: '0000',
  onetCode: '00-0000.00', onetTitle: 'Fictional title', mappingNote: 'Fictional',
  mappingStatus: 'unverified', workMode: 'remote', level: 'entry', sdgRoleId: 'fictional', sdgTags: [],
}));

const pageOf = (params: ListJobsParams, catalogue = jobs): JobPage => ({
  jobs: catalogue.slice(((params.page ?? 1) - 1) * CATALOGUE_PAGE_SIZE, (params.page ?? 1) * CATALOGUE_PAGE_SIZE),
  page: params.page ?? 1, limit: CATALOGUE_PAGE_SIZE, total: catalogue.length,
  totalPages: Math.ceil(catalogue.length / CATALOGUE_PAGE_SIZE),
});

function offlineScores(input: JobMatchInput) {
  return {
    scores: jobs.filter(job => input.jobIds?.includes(job.id)).map(job => {
      const matchedSkills = job.requiredSkills.filter(skill => input.candidateSkills.includes(skill));
      return {
        jobId: job.id, score: Math.round(matchedSkills.length / job.requiredSkills.length * 100),
        matchedSkills, missingSkills: job.requiredSkills.filter(skill => !matchedSkills.includes(skill)),
        skillsConsidered: job.requiredSkills.length,
      };
    }),
  };
}

it('loads 105 listings, searches the final page, counts all results and globally sorts batched scores', async () => {
  const signal = new AbortController().signal;
  const pages: number[] = [];
  const catalogue = await loadJobCatalogue(async (params, receivedSignal) => {
    assert.equal(receivedSignal, signal);
    assert.equal(params.limit, 50);
    pages.push(params.page!);
    return pageOf(params);
  }, signal);
  assert.deepEqual(pages, [1, 2, 3]);
  assert.equal(filterListings(catalogue, emptyListingFilters).length, 105);
  assert.deepEqual(filterListings(catalogue, { ...emptyListingFilters, q: 'tail-only' }).map(job => job.id), ['fictional-104']);
  const batches: number[] = [];
  const scores = await loadJobMatchScores(catalogue, ['Common skill', 'Tail skill'], async (input, receivedSignal) => {
    assert.equal(receivedSignal, signal);
    assert.deepEqual(input.candidateSkills, ['Common skill', 'Tail skill']);
    batches.push(input.jobIds!.length);
    return offlineScores(input);
  }, signal);
  assert.deepEqual(batches, [50, 50, 5]);
  assert.equal(scores.size, 105);
  const sorted = orderListingsByMatch(catalogue, scores);
  assert.equal(sorted.length, 105);
  assert.equal(sorted.slice(0, 12)[0].id, 'fictional-104');
  assert.equal(scores.get('fictional-104')!.score, 100);
  assert.equal(scores.get('fictional-0')!.score, 50);
});

it('handles empty catalogues and exact page boundaries without unnecessary requests', async () => {
  for (const size of [0, 50, 100]) {
    let calls = 0;
    const result = await loadJobCatalogue(async params => {
      calls++;
      return pageOf(params, jobs.slice(0, size));
    }, new AbortController().signal);
    assert.equal(result.length, size);
    assert.equal(calls, Math.max(1, size / 50));
  }
});

it('rejects a failed later page atomically and permits a clean full retry', async () => {
  let published: Job[] | undefined;
  await assert.rejects(async () => {
    published = await loadJobCatalogue(async params => {
      if (params.page === 2) throw new Error('offline page failure');
      return pageOf(params);
    }, new AbortController().signal);
  }, /offline page failure/);
  assert.equal(published, undefined);
  assert.equal((await loadJobCatalogue(async params => pageOf(params), new AbortController().signal)).length, 105);
});

it('rejects duplicate, missing, changing and over-bound catalogue pages instead of truncating', async () => {
  for (const scenario of ['duplicate', 'missing', 'changed', 'over-bound']) {
    let calls = 0;
    await assert.rejects(loadJobCatalogue(async params => {
      calls++;
      const result = pageOf(params);
      if (scenario === 'over-bound') return { ...result, total: (MAX_CATALOGUE_PAGES + 1) * 50, totalPages: MAX_CATALOGUE_PAGES + 1 };
      if (params.page === 2) {
        if (scenario === 'duplicate') result.jobs[0] = jobs[0];
        if (scenario === 'missing') result.jobs.pop();
        if (scenario === 'changed') result.total++;
      }
      return result;
    }, new AbortController().signal));
    assert.ok(calls <= 2);
  }
});

it('cancels listing traversal on unmount even when a transport ignores abort', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(loadJobCatalogue(async params => {
    calls++;
    controller.abort();
    return pageOf(params);
  }, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
});

it('profile switch cancels old batches and discards their late response while the new profile completes', async () => {
  const oldProfile = new AbortController();
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const oldResult = loadJobMatchScores(jobs, ['Common skill'], async input => {
    calls++;
    if (calls === 2) await gate;
    return offlineScores(input);
  }, oldProfile.signal);
  // Allow the first batch to resolve and the second to become in-flight.
  await Promise.resolve();
  assert.equal(calls, 2);
  oldProfile.abort();
  const newScores = await loadJobMatchScores(jobs, ['Tail skill'], async input => offlineScores(input), new AbortController().signal);
  release();
  await assert.rejects(oldResult, { name: 'AbortError' });
  assert.equal(calls, 2); // Never requests the old profile's third batch.
  assert.deepEqual(orderListingsByMatch(jobs, newScores).map(job => job.id), ['fictional-104']);
});

it('rejects failed or incomplete score batches without exposing a partial global ranking; retry succeeds', async () => {
  for (const scenario of ['failure', 'missing', 'duplicate', 'unexpected']) {
    let published: Map<string, unknown> | undefined;
    await assert.rejects(async () => {
      published = await loadJobMatchScores(jobs, ['Tail skill'], async input => {
        const result = offlineScores(input);
        if (input.jobIds![0] === 'fictional-50') {
          if (scenario === 'failure') throw new Error('offline score failure');
          if (scenario === 'missing') result.scores.pop();
          if (scenario === 'duplicate') result.scores[1] = result.scores[0];
          if (scenario === 'unexpected') result.scores[0].jobId = 'unknown-fictional-id';
        }
        return result;
      }, new AbortController().signal);
    });
    assert.equal(published, undefined);
  }
  const scores = await loadJobMatchScores(jobs, ['Tail skill'], async input => offlineScores(input), new AbortController().signal);
  assert.equal(scores.size, 105);
});
