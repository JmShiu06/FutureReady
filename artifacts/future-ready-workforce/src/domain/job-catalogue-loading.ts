import type { Job, JobMatchInput, JobMatchScore, JobMatchScores, JobPage, ListJobsParams } from '@workspace/api-client-react';

export const CATALOGUE_PAGE_SIZE = 50;
// Bound runaway/inconsistent pagination. Exceeding this fails visibly, never truncates.
export const MAX_CATALOGUE_PAGES = 200;
const MATCH_BATCH_SIZE = 50;

type PageLoader = (params: ListJobsParams, signal: AbortSignal) => Promise<JobPage>;
type ScoreLoader = (input: JobMatchInput, signal: AbortSignal) => Promise<JobMatchScores>;

/** Sequential requests bound concurrency to one; publish only a complete catalogue. */
export async function loadJobCatalogue(loadPage: PageLoader, signal: AbortSignal): Promise<Job[]> {
  const jobs: Job[] = [];
  const ids = new Set<string>();
  let total: number | undefined;
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    signal.throwIfAborted();
    const result = await loadPage({ page, limit: CATALOGUE_PAGE_SIZE, sort: 'recent' }, signal);
    signal.throwIfAborted();
    if (!Number.isSafeInteger(result.total) || result.total < 0
      || result.page !== page || result.limit !== CATALOGUE_PAGE_SIZE
      || result.totalPages !== Math.ceil(result.total / CATALOGUE_PAGE_SIZE)
      || result.totalPages > MAX_CATALOGUE_PAGES
      || (total !== undefined && result.total !== total)) {
      throw new Error('The catalogue changed or exceeded the loading limit. Retry listings.');
    }
    total = result.total;
    totalPages = result.totalPages;
    const expected = Math.min(CATALOGUE_PAGE_SIZE, total - jobs.length);
    if (result.jobs.length !== expected) throw new Error('Incomplete catalogue page. Retry listings.');
    for (const job of result.jobs) {
      if (ids.has(job.id)) throw new Error('Duplicate catalogue listing. Retry listings.');
      ids.add(job.id);
      jobs.push(job);
    }
  }
  return jobs;
}

/** Reuse server overlap scores, atomically, without caching personal skills. */
export async function loadJobMatchScores(
  jobs: Job[], candidateSkills: string[], loadScores: ScoreLoader, signal: AbortSignal,
): Promise<Map<string, JobMatchScore>> {
  const scores = new Map<string, JobMatchScore>();
  for (let start = 0; start < jobs.length; start += MATCH_BATCH_SIZE) {
    signal.throwIfAborted();
    const jobIds = jobs.slice(start, start + MATCH_BATCH_SIZE).map(job => job.id);
    const result = await loadScores({ candidateSkills: candidateSkills.slice(0, 50), jobIds }, signal);
    signal.throwIfAborted();
    const expectedIds = new Set(jobIds);
    if (result.scores.length !== jobIds.length) throw new Error('Incomplete match scores. Retry profile match.');
    for (const score of result.scores) {
      if (!expectedIds.delete(score.jobId)) throw new Error('Unexpected match score. Retry profile match.');
      scores.set(score.jobId, score);
    }
  }
  return scores;
}
