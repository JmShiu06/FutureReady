import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, BriefcaseBusiness, ChevronLeft, ChevronRight, Clock3, MapPin,
  Search, X,
} from 'lucide-react';
import {
  getListJobsQueryKey, useCalculateJobMatchScores, useListJobs,
} from '@workspace/api-client-react';
import type { ListJobsParams } from '@workspace/api-client-react';
import { AiExplainButton } from '@/components/ai-drawer';
import { MatchScore } from '@/components/shared/match-score';
import { DosmOccupationSearch } from '@/components/dosm-occupation-search';

type Props = { profileSkills: string[] };

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function salaryLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return 'Salary not listed';
  const money = (amount: number) => `RM ${amount.toLocaleString('en-MY')}`;
  if (min != null && max != null) return `${money(min)} – ${money(max)}`;
  return min != null ? `From ${money(min)}` : `Up to ${money(max as number)}`;
}

function postedLabel(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date not listed';
  return `Posted ${parsed.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function JobSearchPage({ profileSkills }: Props) {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 350);
  const [page, setPage] = useState(1);

  const params = useMemo<ListJobsParams>(() => ({
    page,
    limit: 20,
    ...(debouncedKeyword ? { q: debouncedKeyword } : {}),
    sort: 'relevance',
  }), [page, debouncedKeyword]);

  const jobsQuery = useListJobs(params, { query: { queryKey: getListJobsQueryKey(params), staleTime: 30_000 } });
  const jobs = jobsQuery.data?.jobs ?? [];
  const matchMutation = useCalculateJobMatchScores();
  const skillSignature = profileSkills.join('|');
  const jobSignature = jobs.map(job => job.id).join('|');

  useEffect(() => {
    if (!profileSkills.length || !jobs.length) return;
    matchMutation.reset();
    matchMutation.mutate({ data: { candidateSkills: profileSkills, jobIds: jobs.map(job => job.id) } });
    // The effect is intentionally tied to the stable skills/list identities.
  }, [skillSignature, jobSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  const scores = matchMutation.data?.scores ?? [];
  const scoreById = new Map(scores.map(score => [score.jobId, score]));
  const orderedJobs = useMemo(() => {
    const ordered = [...jobs];
    if (profileSkills.length) {
      return ordered.sort((a, b) => (scoreById.get(b.id)?.score ?? -1) - (scoreById.get(a.id)?.score ?? -1));
    }
    return ordered;
  }, [jobs, profileSkills.length, scores]);
  const total = jobsQuery.data?.total ?? 0;
  const pages = jobsQuery.data?.totalPages ?? 1;

  return <div className="jobs-page" data-testid="page-job-search">
    <DosmOccupationSearch />

    <section className="jobs-search-panel panel" aria-label="Search job listings">
      <div className="jobs-search-row">
        <label className="jobs-search-box">
          <Search size={17} aria-hidden="true" />
          <input value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1); }} placeholder="Search titles, companies, or skills" aria-label="Search job listings" data-testid="input-job-search" />
          {keyword && <button className="search-clear" onClick={() => { setKeyword(''); setPage(1); }} aria-label="Clear search" data-testid="button-clear-search"><X size={15} /></button>}
        </label>
      </div>
    </section>

    <div className="jobs-results-heading">
      <div><div className="eyebrow">Sample listings</div><h2 data-testid="text-job-results-count">{jobsQuery.isLoading ? 'Finding roles…' : `${total.toLocaleString()} sample ${total === 1 ? 'role' : 'roles'}`}</h2></div>
      {profileSkills.length > 0
        ? <span className="jobs-profile-note" data-testid="text-profile-skill-source">{profileSkills.length} skills from your saved device profile · review or update them in My profile</span>
        : <span className="jobs-profile-note">Add skills to your profile to see overlap</span>}
    </div>

    {jobsQuery.isLoading && <div className="jobs-list" aria-label="Loading job listings" data-testid="status-jobs-loading">{[1, 2, 3].map(item => <div className="job-skeleton panel" key={item}><i /><i /><i /><i /></div>)}</div>}
    {jobsQuery.isError && <div className="jobs-state panel jobs-error" role="alert" data-testid="status-jobs-error"><span className="jobs-state-icon">!</span><h3>Listings could not be loaded</h3><p>There was a problem reaching the sample job service. Your search is still here—try again.</p><button className="btn btn-primary" onClick={() => jobsQuery.refetch()} data-testid="button-retry-jobs">Retry listings</button></div>}
    {matchMutation.isPending && <div className="jobs-profile-note" role="status" data-testid="status-job-matching">Calculating profile skill overlap…</div>}
    {matchMutation.isError && profileSkills.length > 0 && <div className="jobs-profile-error" role="alert" data-testid="status-job-match-error">Profile match scores could not be calculated. <button className="text-link" onClick={() => { matchMutation.reset(); matchMutation.mutate({ data: { candidateSkills: profileSkills, jobIds: jobs.map(job => job.id) } }); }} data-testid="button-retry-job-match">Retry profile match</button></div>}
    {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 && <div className="jobs-state panel" data-testid="status-jobs-empty"><span className="jobs-state-icon"><Search size={18} /></span><h3>No sample roles match this search.</h3><p>Try a broader search to see more examples.</p>{keyword && <button className="btn btn-secondary" onClick={() => { setKeyword(''); setPage(1); }} data-testid="button-empty-clear-search">Clear search</button>}</div>}

    {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length > 0 && <div className="jobs-list" data-testid="list-jobs">
      {orderedJobs.map((job, index) => {
        const score = scoreById.get(job.id);
        const applyAction = job.externalUrl
          ? <a className="btn btn-primary job-apply-link" href={job.externalUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-apply-${job.id}`}>Apply externally <ArrowRight size={13} /></a>
          : <button className="btn btn-secondary job-apply-link" disabled title="No application link in demo data" data-testid={`button-apply-disabled-${job.id}`}>No application link in demo data</button>;
        return <article className="job-card panel" key={job.id} style={{ animationDelay: `${Math.min(index * 45, 180)}ms` }} data-testid={`card-job-${job.id}`}>
          <div className="job-card-main">
            <div className="job-company-mark">{job.company.slice(0, 1).toUpperCase()}</div>
            <div className="job-card-copy">
              <div className="job-title-line"><Link href={`/careers-and-jobs/listings/${encodeURIComponent(job.id)}`} className="job-title-link" data-testid={`link-job-title-${job.id}`}>{job.title}</Link></div>
              <div className="job-company">{job.company}</div>
              <p className="job-short-description">{job.shortDescription}</p>
            </div>
            {score && <MatchScore metric="exact" value={score.score} matched={score.matchedSkills.length} considered={score.skillsConsidered} testId={`text-match-score-${job.id}`} />}
          </div>
          <div className="job-card-footer">
            <div className="job-meta">
              <span><MapPin size={13} />{job.location}</span>
              <span className="job-salary">{salaryLabel(job.salaryMin, job.salaryMax)}</span>
              <span><BriefcaseBusiness size={13} />{job.employmentType.replace('-', ' ')}</span>
              <span><Clock3 size={13} />{postedLabel(job.datePosted)}</span>
            </div>
            <div className="job-card-actions"><Link className="job-details-link" href={`/careers-and-jobs/listings/${encodeURIComponent(job.id)}`} data-testid={`link-job-details-${job.id}`}>View details <ArrowRight size={13} /></Link>{applyAction}</div>
          </div>
          <div className="job-ai-row"><AiExplainButton request={{ feature: 'job-fit', jobId: job.id }} label="Explain job fit with AI" small quiet testId={`button-ai-job-fit-${job.id}`} /></div>
        </article>;
      })}
    </div>}

    {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length > 0 && <div className="jobs-pagination" data-testid="pagination-jobs">
      <span>Page {jobsQuery.data?.page ?? page} of {Math.max(pages, 1)} <i /> {total} sample listings</span>
      <div><button className="btn btn-secondary btn-small" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1} data-testid="button-jobs-previous"><ChevronLeft size={14} /> Previous</button><button className="btn btn-secondary btn-small" onClick={() => setPage(value => Math.min(pages, value + 1))} disabled={page >= pages} data-testid="button-jobs-next">Next <ChevronRight size={14} /></button></div>
    </div>}

  </div>;
}

export default JobSearchPage;
