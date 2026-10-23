import type { Job, JobMatchScore } from '@workspace/api-client-react';

export type ListingFilters = {
  q: string; occupation: string; location: string; workMode: string; level: string; sdg: string;
};
export const emptyListingFilters: ListingFilters = { q: '', occupation: '', location: '', workMode: '', level: '', sdg: '' };

export const jobLocation = (job: Job) => job.state ?? job.location;

/** Case-insensitive match on title, occupation name, MASCO code and O*NET skill names. */
export function matchesQuery(job: Job, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [job.title, job.occupationName, job.mascoCode, ...job.requiredSkills]
    .some(field => field.toLowerCase().includes(needle));
}

export function filterListings(jobs: Job[], f: ListingFilters) {
  return jobs.filter(job => matchesQuery(job, f.q)
    && (!f.occupation || job.occupationId === f.occupation)
    && (!f.location || jobLocation(job) === f.location)
    && (!f.workMode || job.workMode === f.workMode)
    && (!f.level || job.level === f.level)
    && (!f.sdg || job.sdgTags.includes(Number(f.sdg))));
}

/** Use existing server scores only; filter/sort the whole result before paging. */
export function orderListingsByMatch(jobs: Job[], scores: Map<string, JobMatchScore>) {
  return jobs.filter(job => (scores.get(job.id)?.score ?? 0) > 0)
    .sort((a, b) => scores.get(b.id)!.score - scores.get(a.id)!.score);
}
