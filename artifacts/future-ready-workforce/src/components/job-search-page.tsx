import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BriefcaseBusiness, ChevronLeft, ChevronRight, Layers, MapPin, Search, X } from 'lucide-react';
import { getListJobsQueryKey, useCalculateJobMatchScores, useListJobs } from '@workspace/api-client-react';
import type { JobMatchScore, ListJobsParams } from '@workspace/api-client-react';
import { MatchScore } from '@/components/shared/match-score';
import { DosmOccupationSearch } from '@/components/dosm-occupation-search';
import { ExternalJobLinks, SampleListingBadge } from '@/components/shared/external-job-links';
import { emptyListingFilters, filterListings, orderListingsByMatch, jobLocation, type ListingFilters } from '@/domain/job-listing-filters';
import '@/components/job-listings.css';

type Props = { profileSkills: string[] };
const PAGE_SIZE = 12;
const LIST_PARAMS: ListJobsParams = { page: 1, limit: 50 };
const modeLabel: Record<string, string> = { 'on-site': 'On-site', hybrid: 'Hybrid', remote: 'Remote' };
const levelLabel: Record<string, string> = { entry: 'Entry level', mid: 'Mid level', senior: 'Senior level' };

export function JobSearchPage({ profileSkills }: Props) {
  const [filters, setFilters] = useState<ListingFilters>(emptyListingFilters);
  const [matchOnly, setMatchOnly] = useState(false);
  const [page, setPage] = useState(1);
  const update = (patch: Partial<ListingFilters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };

  const jobsQuery = useListJobs(LIST_PARAMS, { query: { queryKey: getListJobsQueryKey(LIST_PARAMS), staleTime: 30_000 } });
  const allJobs = useMemo(() => jobsQuery.data?.jobs ?? [], [jobsQuery.data]);

  // Async scores, guarded against stale responses when skills or the catalogue change.
  const matchMutation = useCalculateJobMatchScores();
  const mutateAsyncRef = useRef(matchMutation.mutateAsync);
  mutateAsyncRef.current = matchMutation.mutateAsync;
  const requestRef = useRef(0);
  const [storedScores, setScoreState] = useState<{ key: string; status: 'idle' | 'pending' | 'error' | 'ready'; scores: Map<string, JobMatchScore> }>({ key: '', status: 'idle', scores: new Map() });
  const skillSignature = JSON.stringify(profileSkills);
  const jobSignature = JSON.stringify(allJobs.map(j => j.id));
  const scoreKey = `${skillSignature}:${jobSignature}`;
  const scoreState = storedScores.key === scoreKey ? storedScores
    : { status: profileSkills.length && allJobs.length ? 'pending' : 'idle', scores: new Map<string, JobMatchScore>() };
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const token = ++requestRef.current;
    if (!profileSkills.length || !allJobs.length) {
      setScoreState({ key: scoreKey, status: 'idle', scores: new Map() });
      if (!profileSkills.length) setMatchOnly(false);
      return;
    }
    setScoreState({ key: scoreKey, status: 'pending', scores: new Map() });
    mutateAsyncRef.current({ data: { candidateSkills: profileSkills.slice(0, 50), jobIds: allJobs.slice(0, 50).map(j => j.id) } })
      .then(res => { if (token === requestRef.current) setScoreState({ key: scoreKey, status: 'ready', scores: new Map(res.scores.map(s => [s.jobId, s])) }); })
      .catch(() => { if (token === requestRef.current) setScoreState({ key: scoreKey, status: 'error', scores: new Map() }); });
    return () => { requestRef.current++; };
  }, [skillSignature, jobSignature, retryTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const occupations = useMemo(() => [...new Map(allJobs.map(j => [j.occupationId, j.occupationName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [allJobs]);
  const locations = useMemo(() => [...new Set(allJobs.map(jobLocation))].sort(), [allJobs]);
  const sdgs = useMemo(() => [...new Set(allJobs.flatMap(j => j.sdgTags))].sort((a, b) => a - b), [allJobs]);

  const results = useMemo(() => {
    const base = filterListings(allJobs, filters);
    if (!matchOnly) return base;
    if (scoreState.status !== 'ready') return [];
    return orderListingsByMatch(base, scoreState.scores);
  }, [allJobs, filters, matchOnly, scoreState]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const activeCount = Object.values(filters).filter(Boolean).length + Number(matchOnly);
  const reset = () => { setFilters(emptyListingFilters); setMatchOnly(false); setPage(1); };
  const matchWaiting = matchOnly && scoreState.status === 'pending';

  return <div className="jobs-page" data-testid="page-job-search">
    <DosmOccupationSearch />

    <section className="jobs-search-panel panel" aria-label="Search sample listings">
      <label className="jobs-search-box">
        <Search size={17} aria-hidden="true" />
        <input value={filters.q} onChange={e => update({ q: e.target.value })} placeholder="Search title, occupation, MASCO code or skill — try data, nurse, cyber" aria-label="Search sample listings" data-testid="input-job-search" />
        {filters.q && <button className="search-clear" onClick={() => update({ q: '' })} aria-label="Clear search" data-testid="button-clear-search"><X size={15} /></button>}
      </label>
      <div className="jl-filters">
        <select className="select-field" value={filters.occupation} onChange={e => update({ occupation: e.target.value })} aria-label="Occupation" data-testid="select-filter-occupation">
          <option value="">All occupations</option>{occupations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className="select-field" value={filters.location} onChange={e => update({ location: e.target.value })} aria-label="Malaysian location" data-testid="select-filter-location">
          <option value="">All locations</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="select-field" value={filters.workMode} onChange={e => update({ workMode: e.target.value })} aria-label="Work mode" data-testid="select-filter-mode">
          <option value="">Any work mode</option>{Object.entries(modeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-field" value={filters.level} onChange={e => update({ level: e.target.value })} aria-label="Level" data-testid="select-filter-level">
          <option value="">Any level</option>{Object.entries(levelLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-field" value={filters.sdg} onChange={e => update({ sdg: e.target.value })} aria-label="SDG" data-testid="select-filter-sdg">
          <option value="">Any SDG</option>{sdgs.map(n => <option key={n} value={String(n)}>SDG {n}</option>)}
        </select>
        <label className={`jl-check${profileSkills.length ? '' : ' disabled'}`} title={profileSkills.length ? 'Show listings that share at least one skill with your profile, highest overlap first' : 'Add skills to your profile first'}>
          <input type="checkbox" checked={matchOnly} disabled={!profileSkills.length} onChange={e => { setMatchOnly(e.target.checked); setPage(1); }} data-testid="checkbox-matches-my-skills" />
          Matches my skills
        </label>
        {activeCount > 0 && <button className="text-link" onClick={reset} data-testid="button-reset-filters">Reset filters ({activeCount})</button>}
      </div>
    </section>

    <div className="jobs-results-heading">
      <div><div className="eyebrow">Sample listings (fictional)</div>
        <h2 data-testid="text-job-results-count" aria-live="polite">{jobsQuery.isLoading || matchWaiting ? 'Finding listings…' : `${results.length} of ${allJobs.length} sample ${allJobs.length === 1 ? 'listing' : 'listings'}`}</h2></div>
      {profileSkills.length > 0
        ? <span className="jobs-profile-note" data-testid="text-profile-skill-source">{profileSkills.length} skills from your saved device profile{matchOnly ? ' · sorted by exact skill overlap' : ''}</span>
        : <span className="jobs-profile-note">Add skills to your profile to see overlap</span>}
    </div>

    {(jobsQuery.isLoading || matchWaiting) && <div className="jobs-list" aria-label="Loading listings" data-testid="status-jobs-loading">{[1, 2, 3].map(i => <div className="job-skeleton panel" key={i}><i /><i /><i /><i /></div>)}</div>}
    {jobsQuery.isError && <div className="jobs-state panel jobs-error" role="alert" data-testid="status-jobs-error"><span className="jobs-state-icon">!</span><h3>Listings could not be loaded</h3><p>There was a problem reaching the sample listing service. Your filters are kept.</p><button className="btn btn-primary" onClick={() => jobsQuery.refetch()} data-testid="button-retry-jobs">Retry listings</button></div>}
    {scoreState.status === 'error' && <div className="jobs-profile-error" role="alert" data-testid="status-job-match-error">Profile match scores could not be calculated. <button className="text-link" onClick={() => setRetryTick(t => t + 1)} data-testid="button-retry-job-match">Retry profile match</button></div>}

    {jobsQuery.data && !matchWaiting && results.length === 0 && !(matchOnly && scoreState.status === 'error') && <div className="jobs-state panel" data-testid="status-jobs-empty">
      <span className="jobs-state-icon"><Search size={18} /></span>
      <h3>No sample listings match.</h3>
      <p>Try a broader word like <b>data</b>, <b>nurse</b> or <b>cyber</b>, a 4-digit MASCO code, or remove a filter{matchOnly ? ' — “Matches my skills” only keeps listings sharing at least one exact skill' : ''}.</p>
      <div className="row">{['data', 'nurse', 'cyber'].map(s => <button key={s} className="btn btn-secondary btn-small" onClick={() => update({ ...emptyListingFilters, q: s })} data-testid={`button-suggest-${s}`}>Search “{s}”</button>)}
        {activeCount > 0 && <button className="btn btn-primary btn-small" onClick={reset} data-testid="button-empty-reset">Reset filters</button>}</div>
    </div>}

    {!matchWaiting && visible.length > 0 && <div className="jobs-list" data-testid="list-jobs">
      {visible.map((job, index) => {
        const score = scoreState.scores.get(job.id);
        const href = `/careers-and-jobs/listings/${encodeURIComponent(job.id)}`;
        return <article className="job-card panel" key={job.id} style={{ animationDelay: `${Math.min(index * 40, 180)}ms` }} data-testid={`card-job-${job.id}`}>
          <div className="job-card-main">
            <div className="job-company-mark">{job.company.slice(0, 1).toUpperCase()}</div>
            <div className="job-card-copy">
              <SampleListingBadge testId={`badge-fictional-${job.id}`} />
              <div className="job-title-line"><Link href={href} className="job-title-link" data-testid={`link-job-title-${job.id}`}>{job.title}</Link></div>
              <div className="job-company">{job.company}</div>
              <div className="jl-occupation" data-testid={`text-job-occupation-${job.id}`}>{job.occupationName} · MASCO {job.mascoCode}</div>
              {job.mappingStatus === 'unverified' && <p className="small muted">Unverified occupational crosswalk — fictional example only.</p>}
              {job.mascoCode === '2413' && <p className="small muted">Fictional requirements using O*NET names; occupational skill ratings are unavailable.</p>}
              <p className="job-short-description">{job.shortDescription}</p>
              <div className="row">{job.requiredSkills.map(s => <span key={s} className={`chip${score && !score.matchedSkills.includes(s) ? ' gap' : ''}`}>{s}</span>)}</div>
            </div>
            {score && <MatchScore metric="exact" value={score.score} matched={score.matchedSkills.length} considered={score.skillsConsidered} testId={`text-match-score-${job.id}`} />}
          </div>
          <div className="job-card-footer">
            <div className="job-meta">
              <span><MapPin size={13} />{job.location}</span>
              <span><BriefcaseBusiness size={13} />{modeLabel[job.workMode]}</span>
              <span><Layers size={13} />{levelLabel[job.level]}</span>
              <span>{job.sdgTags.length ? job.sdgTags.map(n => `SDG ${n}`).join(', ') : 'No reviewed SDG mapping'}</span>
            </div>
            <div className="job-card-actions"><Link className="job-details-link" href={href} data-testid={`link-job-details-${job.id}`}>View details <ArrowRight size={13} /></Link></div>
          </div>
          <ExternalJobLinks occupationTitle={job.occupationName} testIdSuffix={job.id} compact />
        </article>;
      })}
    </div>}

    {!matchWaiting && results.length > PAGE_SIZE && <div className="jobs-pagination" data-testid="pagination-jobs">
      <span>Page {current} of {pages} <i /> {results.length} sample listings</span>
      <div><button className="btn btn-secondary btn-small" onClick={() => setPage(Math.max(1, current - 1))} disabled={current <= 1} data-testid="button-jobs-previous"><ChevronLeft size={14} /> Previous</button><button className="btn btn-secondary btn-small" onClick={() => setPage(Math.min(pages, current + 1))} disabled={current >= pages} data-testid="button-jobs-next">Next <ChevronRight size={14} /></button></div>
    </div>}
  </div>;
}

export default JobSearchPage;
