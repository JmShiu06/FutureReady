import type { DosmOccupationEmploymentGroup, Job, JobMatchScore } from '@workspace/api-client-react';

/** `group` is a single MASCO major-group digit; `occupation` an existing occupationId. Only one is set at a time. */
export type ListingFilters = {
  q: string; occupation: string; group: string; skill: string; location: string; workMode: string; level: string; sdg: string;
};
export const emptyListingFilters: ListingFilters = { q: '', occupation: '', group: '', skill: '', location: '', workMode: '', level: '', sdg: '' };

export type ResultsView = 'listings' | 'dosm';
export type ListingSearchState = { filters: ListingFilters; matchOnly: boolean; page: number; submitted?: boolean; view?: ResultsView };

/** Filters that only describe fictional samples; DOSM group data has no such dimension. */
export const SAMPLE_ONLY_FILTERS = ['location', 'workMode', 'level'] as const;
export const DOSM_SCOPE_NOTE = "Location, work mode and level don't apply to DOSM group data.";

export const hasSearchCriteria = (f: ListingFilters, matchOnly: boolean) =>
  matchOnly || (Object.keys(emptyListingFilters) as (keyof ListingFilters)[]).some(k => Boolean(f[k].trim()));

/** Read only listing controls, never profile skills or scores. */
export function readListingSearch(search: string | URLSearchParams): ListingSearchState {
  const params = new URLSearchParams(search);
  const rawPage = params.get('page') ?? '';
  const page = /^[1-9]\d*$/.test(rawPage) ? Number(rawPage) : 1;
  const rawGroup = params.get('group') ?? '';
  const occupation = params.get('occupation') ?? '';
  const filters: ListingFilters = {
      q: params.get('q') ?? '',
      occupation,
      group: !occupation && /^[1-9]$/.test(rawGroup) ? rawGroup : '',
      skill: params.get('skill') ?? '',
      location: params.get('location') ?? '',
      workMode: params.get('workMode') ?? '',
      level: params.get('level') ?? '',
      sdg: params.get('sdg') ?? '',
  };
  const matchOnly = params.get('matchOnly') === '1';
  return {
    filters,
    matchOnly,
    page: Number.isSafeInteger(page) ? page : 1,
    // Older URLs carrying q/filters were already "searched".
    submitted: params.get('submitted') === '1' || hasSearchCriteria(filters, matchOnly),
    view: params.get('results') === 'dosm' ? 'dosm' : 'listings',
  };
}

/** Explicit allowlist keeps profile data and arbitrary return URLs out of navigation. */
export function listingSearchParams({ filters, matchOnly, page, submitted, view }: ListingSearchState) {
  const params = new URLSearchParams({ tab: 'listings' });
  for (const key of Object.keys(emptyListingFilters) as (keyof ListingFilters)[]) {
    if (filters[key]) params.set(key, filters[key]);
  }
  if (matchOnly) params.set('matchOnly', '1');
  if (Number.isSafeInteger(page) && page > 1) params.set('page', String(page));
  if (submitted && !hasSearchCriteria(filters, matchOnly)) params.set('submitted', '1');
  if (view === 'dosm') params.set('results', 'dosm');
  return params;
}

export function listingReturnHref(search: string | URLSearchParams) {
  return `/careers-and-jobs?${listingSearchParams(readListingSearch(search))}`;
}

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
    && (!f.group || mascoGroupCode(job.mascoCode) === f.group)
    && (!f.skill || job.requiredSkills.includes(f.skill))
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

/** MASCO major group = first digit of a 4-digit MASCO code; anything else is unmapped (null). */
export function mascoGroupCode(masco: string | null | undefined): string | null {
  return masco && /^[1-9]\d{3}$/.test(masco) ? masco[0] : null;
}

export type OccupationOption = { id: string; name: string; masco: string };
export type OccupationGroupOption = { code: string | null; label: string; occupations: OccupationOption[] };

/** Occupations grouped by MASCO major group; unmapped examples are kept in a separate, non-selectable bucket. */
export function groupOccupationOptions(jobs: Job[], labels: Record<string, string>): OccupationGroupOption[] {
  const byId = new Map<string, OccupationOption>();
  for (const j of jobs) if (!byId.has(j.occupationId)) byId.set(j.occupationId, { id: j.occupationId, name: j.occupationName, masco: j.mascoCode });
  const buckets = new Map<string | null, OccupationOption[]>();
  for (const o of byId.values()) {
    const code = mascoGroupCode(o.masco);
    buckets.set(code, [...(buckets.get(code) ?? []), o]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a ?? 'z').localeCompare(b ?? 'z'))
    .map(([code, occupations]) => ({
      code,
      label: code ? labels[code] ?? `MASCO major group ${code}` : 'Other examples (no MASCO group)',
      occupations: occupations.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export type DosmFilterInput = { filters: ListingFilters; matchOnly: boolean; scores?: Map<string, JobMatchScore> };

/**
 * Shared filters applied to DOSM groups. Never changes employedThousands; only narrows which groups show.
 * group/occupation: by MASCO first digit. skill: reviewed generalSkills or a mapped sample occupation's skills.
 * sdg / matchOnly: groups containing a mapped sample occupation with that evidence. Location/mode/level are ignored.
 */
export function filterDosmGroups<G extends DosmOccupationEmploymentGroup>(groups: G[], jobs: Job[], { filters: f, matchOnly, scores }: DosmFilterInput) {
  const occupationGroup = f.occupation ? mascoGroupCode(jobs.find(j => j.occupationId === f.occupation)?.mascoCode) : null;
  const jobsIn = (code: string) => jobs.filter(j => mascoGroupCode(j.mascoCode) === code);
  return groups.filter(g => {
    if (f.group && g.code !== f.group) return false;
    if (f.occupation && g.code !== occupationGroup) return false;
    if (f.skill && !g.generalSkills.includes(f.skill) && !jobsIn(g.code).some(j => j.requiredSkills.includes(f.skill))) return false;
    if (f.sdg && !jobsIn(g.code).some(j => j.sdgTags.includes(Number(f.sdg)))) return false;
    if (matchOnly && !jobsIn(g.code).some(j => (scores?.get(j.id)?.score ?? 0) > 0)) return false;
    return true;
  });
}

export type DosmKeywordGroup = DosmOccupationEmploymentGroup & { matchedVia: string[] };

/**
 * Unified keyword for DOSM groups: the server's title/group-label matches, plus (transparently labelled)
 * groups whose reviewed general skills, MASCO code, or mapped sample listings match the same keyword.
 * Group objects are the server's own; employedThousands is never altered.
 */
export function matchDosmKeyword(catalogue: DosmOccupationEmploymentGroup[], serverMatches: DosmOccupationEmploymentGroup[] | null, jobs: Job[], q: string): DosmKeywordGroup[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return catalogue.map(g => ({ ...g, matchedVia: [] }));
  const server = new Map((serverMatches ?? []).map(g => [g.code, g]));
  const out: DosmKeywordGroup[] = [];
  for (const g of catalogue) {
    const via: string[] = [];
    const hit = server.get(g.code);
    if (hit) via.push('DOSM group or MyCOL title');
    if (/^[1-9]\d{0,3}$/.test(needle) && needle[0] === g.code) via.push('MASCO code');
    if (g.generalSkills.some(s => s.toLowerCase().includes(needle))) via.push('reviewed general skill');
    if (jobs.some(j => mascoGroupCode(j.mascoCode) === g.code && matchesQuery(j, needle))) via.push('mapped sample listing');
    if (via.length) out.push({ ...(hit ?? g), employedThousands: g.employedThousands, matchedVia: via });
  }
  return out;
}
