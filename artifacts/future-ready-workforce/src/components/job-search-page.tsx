import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'wouter';
import { ArrowRight, BriefcaseBusiness, ChevronLeft, ChevronRight, Info, Layers, MapPin, Search, SlidersHorizontal, UsersRound, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { calculateJobMatchScores, listJobs, useGetDosmOccupationEmploymentSearch, getGetDosmOccupationEmploymentSearchQueryKey } from '@workspace/api-client-react';
import type { JobMatchScore } from '@workspace/api-client-react';
import { MatchScore } from '@/components/shared/match-score';
import { ExternalJobLinks, SampleListingBadge } from '@/components/shared/external-job-links';
import { DosmGroupCard, DosmSourcesDetails } from '@/components/dosm-group-results';
import {
  emptyListingFilters, filterListings, orderListingsByMatch, jobLocation, readListingSearch, listingSearchParams,
  groupOccupationOptions, filterDosmGroups, matchDosmKeyword, DOSM_SCOPE_NOTE, SAMPLE_ONLY_FILTERS,
  type ListingFilters, type ListingSearchState, type ResultsView,
} from '@/domain/job-listing-filters';
import { loadJobCatalogue, loadJobMatchScores } from '@/domain/job-catalogue-loading';
import '@/components/job-listings.css';

type Props = { profileSkills: string[] };
const PAGE_SIZE = 12;
const EXAMPLES = ['data', 'nurse', 'cyber'];
const modeLabel: Record<string, string> = { 'on-site': 'On-site', hybrid: 'Hybrid', remote: 'Remote' };
const levelLabel: Record<string, string> = { entry: 'Entry level', mid: 'Mid level', senior: 'Senior level' };
const desktop = () => typeof window === 'undefined' || window.matchMedia('(min-width: 761px)').matches;

export function JobSearchPage({ profileSkills }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchState = useMemo(() => readListingSearch(searchParams), [searchParams]);
  const { filters, page } = searchState;
  const submitted = Boolean(searchState.submitted);
  const view: ResultsView = searchState.view ?? 'listings';
  const matchOnly = searchState.matchOnly && profileSkills.length > 0;
  const changeSearch = (change: (state: ListingSearchState) => ListingSearchState) => {
    setSearchParams(previous => listingSearchParams(change(readListingSearch(previous))), { replace: true });
  };
  // Draft keyword is local; it only reaches the URL on Search/Enter, and filter changes never wipe it.
  const [draft, setDraft] = useState(filters.q);
  const lastUrlQ = useRef(filters.q);
  useEffect(() => { if (filters.q !== lastUrlQ.current) { lastUrlQ.current = filters.q; setDraft(filters.q); } }, [filters.q]);
  const [panelOpen, setPanelOpen] = useState(desktop);
  const [tipOpen, setTipOpen] = useState(false);

  const setPage = (page: number) => changeSearch(state => ({ ...state, page }));
  const setView = (view: ResultsView) => changeSearch(state => ({ ...state, view }));
  const setMatchOnly = (matchOnly: boolean) => changeSearch(state => ({ ...state, matchOnly, page: 1, submitted: true }));
  const update = (patch: Partial<ListingFilters>) => changeSearch(state => ({ ...state, filters: { ...state.filters, ...patch }, page: 1, submitted: true }));
  const submit = (q = draft) => { setDraft(q); changeSearch(state => ({ ...state, filters: { ...state.filters, q: q.trim() }, page: 1, submitted: true })); };
  const clearAll = () => { setDraft(''); changeSearch(() => ({ filters: emptyListingFilters, matchOnly: false, page: 1, submitted: false, view: 'listings' })); };

  useEffect(() => {
    if (!profileSkills.length && searchState.matchOnly) {
      setSearchParams(previous => listingSearchParams({ ...readListingSearch(previous), matchOnly: false }), { replace: true });
    }
  }, [profileSkills.length, searchState.matchOnly, setSearchParams]);

  const jobsQuery = useQuery({
    queryKey: ['complete-job-catalogue'],
    queryFn: ({ signal }) => loadJobCatalogue((params, signal) => listJobs(params, { signal }), signal),
    staleTime: 30_000,
    retry: false,
  });
  const allJobs = useMemo(() => jobsQuery.isError ? [] : jobsQuery.data ?? [], [jobsQuery.data, jobsQuery.isError]);

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
    const controller = new AbortController();
    if (!profileSkills.length || !allJobs.length) {
      setScoreState({ key: scoreKey, status: 'idle', scores: new Map() });
      return;
    }
    setScoreState({ key: scoreKey, status: 'pending', scores: new Map() });
    loadJobMatchScores(allJobs, profileSkills,
      (input, signal) => calculateJobMatchScores(input, { signal }), controller.signal)
      .then(scores => { if (token === requestRef.current) setScoreState({ key: scoreKey, status: 'ready', scores }); })
      .catch(() => { if (token === requestRef.current) setScoreState({ key: scoreKey, status: 'error', scores: new Map() }); });
    return () => { requestRef.current++; controller.abort(); };
  }, [skillSignature, jobSignature, retryTick, allJobs]); // eslint-disable-line react-hooks/exhaustive-deps

  // DOSM: full catalogue (nine groups, labels, skills) + the server's own title/group search for the submitted keyword.
  const dosmCatalogue = useGetDosmOccupationEmploymentSearch({});
  const dosmParams = { q: filters.q || undefined };
  const dosmSearch = useGetDosmOccupationEmploymentSearch(dosmParams, { query: { enabled: Boolean(filters.q), queryKey: getGetDosmOccupationEmploymentSearchQueryKey(dosmParams) } });
  const groupLabels = useMemo(() => Object.fromEntries((dosmCatalogue.data?.occupationGroups ?? []).map(g => [g.code, g.label])), [dosmCatalogue.data]);
  const occupationGroups = useMemo(() => groupOccupationOptions(allJobs, groupLabels), [allJobs, groupLabels]);
  const skillOptions = useMemo(() => [...new Set([...allJobs.flatMap(j => j.requiredSkills), ...(dosmCatalogue.data?.occupationGroups ?? []).flatMap(g => g.generalSkills)])].sort((a, b) => a.localeCompare(b)), [allJobs, dosmCatalogue.data]);
  const locations = useMemo(() => [...new Set(allJobs.map(jobLocation))].sort(), [allJobs]);
  const sdgs = useMemo(() => [...new Set(allJobs.flatMap(j => j.sdgTags))].sort((a, b) => a - b), [allJobs]);

  const results = useMemo(() => {
    const base = filterListings(allJobs, filters);
    if (!matchOnly) return base;
    if (scoreState.status !== 'ready') return [];
    return orderListingsByMatch(base, scoreState.scores);
  }, [allJobs, filters, matchOnly, scoreState]);

  const dosmData = dosmCatalogue.data;
  const dosmLoading = dosmCatalogue.isPending || (Boolean(filters.q) && dosmSearch.isPending) || (matchOnly && scoreState.status === 'pending') || (jobsQuery.isLoading);
  const dosmError = dosmCatalogue.isError || (Boolean(filters.q) && dosmSearch.isError) || jobsQuery.isError || (matchOnly && scoreState.status === 'error');
  const dosmGroups = useMemo(() => {
    if (!dosmData || dosmLoading || dosmError) return [];
    const keyword = matchDosmKeyword(dosmData.occupationGroups, filters.q ? dosmSearch.data?.occupationGroups ?? [] : null, allJobs, filters.q);
    return filterDosmGroups(keyword, allJobs, { filters, matchOnly, scores: scoreState.scores });
  }, [dosmData, dosmLoading, dosmError, dosmSearch.data, allJobs, filters, matchOnly, scoreState.scores]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const matchWaiting = matchOnly && scoreState.status === 'pending';
  const listingsLoading = jobsQuery.isLoading || matchWaiting;
  const listingsFailed = jobsQuery.isError || (matchOnly && scoreState.status === 'error');
  const sampleScoped = SAMPLE_ONLY_FILTERS.some(k => filters[k]);

  const occupationValue = filters.group ? `group:${filters.group}` : filters.occupation;
  const setOccupation = (value: string) => update(value.startsWith('group:') ? { group: value.slice(6), occupation: '' } : { occupation: value, group: '' });
  const occupationName = allJobs.find(j => j.occupationId === filters.occupation)?.occupationName ?? filters.occupation;

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, remove: () => { setDraft(''); update({ q: '' }); } });
  if (filters.group) chips.push({ key: 'group', label: `Group: ${groupLabels[filters.group] ?? `MASCO ${filters.group}`}`, remove: () => update({ group: '' }) });
  if (filters.occupation) chips.push({ key: 'occupation', label: `Occupation: ${occupationName}`, remove: () => update({ occupation: '' }) });
  if (filters.skill) chips.push({ key: 'skill', label: `Skill: ${filters.skill}`, remove: () => update({ skill: '' }) });
  if (filters.location) chips.push({ key: 'location', label: filters.location, remove: () => update({ location: '' }) });
  if (filters.workMode) chips.push({ key: 'workMode', label: modeLabel[filters.workMode] ?? filters.workMode, remove: () => update({ workMode: '' }) });
  if (filters.level) chips.push({ key: 'level', label: levelLabel[filters.level] ?? filters.level, remove: () => update({ level: '' }) });
  if (filters.sdg) chips.push({ key: 'sdg', label: `SDG ${filters.sdg}`, remove: () => update({ sdg: '' }) });
  if (matchOnly) chips.push({ key: 'matchOnly', label: 'Matches my skills', remove: () => setMatchOnly(false) });
  const filterCount = chips.filter(c => c.key !== 'q').length;
  const canClear = chips.length > 0 || draft.length > 0 || submitted;

  const listingCount = listingsLoading ? '…' : listingsFailed ? '!' : String(results.length);
  const dosmCount = dosmLoading ? '…' : dosmError ? '!' : String(dosmGroups.length);

  const emptyHelp = <div className="jx-empty-actions">
    {filterCount > 0 && <button className="btn btn-primary btn-small" onClick={clearAll} data-testid="button-empty-reset">Clear all filters</button>}
    {EXAMPLES.map(s => <button key={s} className="jx-example" onClick={() => submit(s)} data-testid={`button-suggest-${s}`}>{s}</button>)}
  </div>;

  return <div className="jobs-page" data-testid="page-job-search">
    <section className="jx-search panel" aria-labelledby="jx-search-title" data-testid="panel-dosm-occupation-search">
      <div className="dosm-occupation-heading">
        <div className="dosm-occupation-icon" aria-hidden="true"><UsersRound size={18} /></div>
        <div>
          <div className="eyebrow">Careers & labour-market data</div>
          <h2 id="jx-search-title">Search occupations & listings</h2>
          <p>One search across fictional sample listings and official DOSM occupation groups.</p>
        </div>
      </div>

      <form className="jx-bar" role="search" onSubmit={e => { e.preventDefault(); submit(); }}>
        <label className="dosm-occupation-input jx-input">
          <Search size={17} aria-hidden="true" />
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={100}
            placeholder="Title, occupation, MASCO code or skill" aria-label="Search occupations and sample listings" data-testid="input-job-search" />
          {draft && <button type="button" className="search-clear" onClick={() => setDraft('')} aria-label="Clear search text" data-testid="button-clear-search"><X size={14} /></button>}
        </label>
        <button type="submit" className="btn btn-primary jx-submit" data-testid="button-search"><Search size={15} aria-hidden="true" /> Search</button>
        <button type="button" className={`jobs-filter-toggle${panelOpen ? ' open' : ''}`} onClick={() => setPanelOpen(o => !o)}
          aria-label={`Filters${filterCount ? ` (${filterCount} active)` : ''}`} aria-expanded={panelOpen} aria-controls="jx-filters" data-testid="button-toggle-filters">
          <SlidersHorizontal size={18} aria-hidden="true" />
          {filterCount > 0 && <span className="jobs-filter-count" aria-hidden="true">{filterCount}</span>}
        </button>
      </form>

      <div className="jx-chips-row">
        {chips.length > 0 && <ul className="jx-chips" aria-label="Active search and filters" data-testid="list-active-filters">
          {chips.map(c => <li key={c.key}><span className="jx-chip">{c.label}<button type="button" onClick={c.remove} aria-label={`Remove ${c.label}`} data-testid={`button-remove-filter-${c.key}`}><X size={12} /></button></span></li>)}
        </ul>}
        {canClear && <button type="button" className="text-link jx-clear" onClick={clearAll} data-testid="button-clear-all">Clear all</button>}
      </div>

      <div id="jx-filters" className="jx-panel" hidden={!panelOpen} data-testid="panel-filters">
        <label className="jx-field">
          <span className="jobs-filter-label">Occupation</span>
          <select className="select-field" value={occupationValue} onChange={e => setOccupation(e.target.value)} data-testid="select-filter-occupation">
            <option value="">All occupations</option>
            {occupationGroups.map(g => <optgroup key={g.code ?? 'other'} label={g.label}>
              {g.code && <option value={`group:${g.code}`}>All {g.label}</option>}
              {g.occupations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </optgroup>)}
          </select>
        </label>
        <label className="jx-field">
          <span className="jobs-filter-label">Skill (O*NET)</span>
          <select className="select-field" value={filters.skill} onChange={e => update({ skill: e.target.value })} data-testid="select-filter-skill">
            <option value="">Any skill</option>{skillOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="jx-field">
          <span className="jobs-filter-label">Location <em>samples only</em></span>
          <select className="select-field" value={filters.location} onChange={e => update({ location: e.target.value })} data-testid="select-filter-location">
            <option value="">All locations</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="jx-field">
          <span className="jobs-filter-label">Work mode <em>samples only</em></span>
          <select className="select-field" value={filters.workMode} onChange={e => update({ workMode: e.target.value })} data-testid="select-filter-mode">
            <option value="">Any work mode</option>{Object.entries(modeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="jx-field">
          <span className="jobs-filter-label">Level <em>samples only</em></span>
          <select className="select-field" value={filters.level} onChange={e => update({ level: e.target.value })} data-testid="select-filter-level">
            <option value="">Any level</option>{Object.entries(levelLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="jx-field">
          <span className="jobs-filter-label">SDG</span>
          <select className="select-field" value={filters.sdg} onChange={e => update({ sdg: e.target.value })} data-testid="select-filter-sdg">
            <option value="">Any SDG</option>{sdgs.map(n => <option key={n} value={String(n)}>SDG {n}</option>)}
          </select>
        </label>
        <label className={`jl-check jx-match${profileSkills.length ? '' : ' disabled'}`} title={profileSkills.length ? 'Listings sharing at least one exact skill with your profile, highest overlap first' : 'Add skills to your profile first'}>
          <input type="checkbox" checked={matchOnly} disabled={!profileSkills.length} onChange={e => setMatchOnly(e.target.checked)} data-testid="checkbox-matches-my-skills" />
          Matches my skills
        </label>
        {dosmCatalogue.isError && <p className="small jx-wide" role="alert">Group names and skills could not be loaded. <button type="button" className="text-link" onClick={() => { void dosmCatalogue.refetch(); }}>Retry</button></p>}
      </div>
    </section>

    {!submitted ? <div className="jobs-state panel jx-welcome" data-testid="status-search-welcome">
      <span className="jobs-state-icon"><Search size={18} /></span>
      <h3>Where would you like to start?</h3>
      <p>Search a title, occupation, MASCO code or skill. You will see fictional sample listings and official DOSM occupation groups side by side.</p>
      <div className="jx-empty-actions">{EXAMPLES.map(s => <button key={s} className="jx-example" onClick={() => submit(s)} data-testid={`button-suggest-${s}`}>{s}</button>)}</div>
    </div> : <section className="jx-results" aria-label="Search results">
      <div className="jx-tabs" role="tablist" aria-label="Result type">
        <button role="tab" id="tab-listings" aria-selected={view === 'listings'} aria-controls="tabpanel-listings" className={`jx-tab${view === 'listings' ? ' active' : ''}`} onClick={() => setView('listings')} data-testid="tab-sample-listings">
          Sample listings <span className="jx-count" data-testid="text-job-results-count">({listingCount})</span>
        </button>
        <span className="jx-tab-wrap">
          <button role="tab" id="tab-dosm" aria-selected={view === 'dosm'} aria-controls="tabpanel-dosm" className={`jx-tab${view === 'dosm' ? ' active' : ''}`} onClick={() => setView('dosm')} data-testid="tab-dosm-groups">
            DOSM occupation groups <span className="jx-count" data-testid="text-dosm-results-count">({dosmCount})</span>
          </button>
          <span className="jx-tip">
            <button type="button" className="jx-tip-btn" aria-label="About DOSM occupation groups" aria-expanded={tipOpen} aria-describedby="jx-tip-text" onClick={() => setTipOpen(o => !o)} onBlur={() => setTipOpen(false)} data-testid="button-dosm-info"><Info size={14} /></button>
            <span id="jx-tip-text" role="tooltip" className={`jx-tip-text${tipOpen ? ' open' : ''}`}>DOSM reports employed people by broad occupation group, not by individual job title. Search titles are from the project’s reviewed MyCOL subset; the number on a result is for the entire DOSM group.</span>
          </span>
        </span>
      </div>

      {view === 'listings' && <div role="tabpanel" id="tabpanel-listings" aria-labelledby="tab-listings">
        <p className="jobs-profile-note jx-note" data-testid="text-profile-skill-source">
          {profileSkills.length > 0 ? `${profileSkills.length} skills from your saved device profile${matchOnly ? ' · sorted by exact skill overlap' : ''}` : 'Add skills to your profile to see overlap'}
          {!listingsLoading && !listingsFailed && ` · ${results.length} of ${allJobs.length} fictional samples`}
        </p>
        {listingsLoading && <div className="jobs-list" aria-label="Loading listings" data-testid="status-jobs-loading">{[1, 2, 3].map(i => <div className="job-skeleton panel" key={i}><i /><i /><i /><i /></div>)}</div>}
        {jobsQuery.isError && <div className="jobs-state panel jobs-error" role="alert" data-testid="status-jobs-error"><span className="jobs-state-icon">!</span><h3>Listings could not be loaded</h3><p>The complete catalogue could not be loaded. Partial results are not shown. Your filters are kept.</p><button className="btn btn-primary" onClick={() => jobsQuery.refetch()} data-testid="button-retry-jobs">Retry listings</button></div>}
        {scoreState.status === 'error' && <div className="jobs-profile-error" role="alert" data-testid="status-job-match-error">Profile match scores could not be calculated. <button className="text-link" onClick={() => setRetryTick(t => t + 1)} data-testid="button-retry-job-match">Retry profile match</button></div>}
        {jobsQuery.data && !listingsLoading && !listingsFailed && results.length === 0 && <div className="jobs-state panel" data-testid="status-jobs-empty">
          <span className="jobs-state-icon"><Search size={18} /></span>
          <h3>No sample listings match.</h3>
          <p>Try clearing filters or a broader word{matchOnly ? ' — “Matches my skills” only keeps listings sharing at least one exact skill' : ''}.</p>
          {emptyHelp}
        </div>}
        {!listingsLoading && visible.length > 0 && <div className="jobs-list" data-testid="list-jobs">
          {visible.map((job, index) => {
            const score = scoreState.scores.get(job.id);
            const href = `/careers-and-jobs/listings/${encodeURIComponent(job.id)}?${listingSearchParams({ ...searchState, matchOnly, page: current })}`;
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
        {!listingsLoading && results.length > PAGE_SIZE && <div className="jobs-pagination" data-testid="pagination-jobs">
          <span>Page {current} of {pages} <i /> {results.length} sample listings</span>
          <div><button className="btn btn-secondary btn-small" onClick={() => setPage(Math.max(1, current - 1))} disabled={current <= 1} data-testid="button-jobs-previous"><ChevronLeft size={14} /> Previous</button><button className="btn btn-secondary btn-small" onClick={() => setPage(Math.min(pages, current + 1))} disabled={current >= pages} data-testid="button-jobs-next">Next <ChevronRight size={14} /></button></div>
        </div>}
      </div>}

      {view === 'dosm' && <div role="tabpanel" id="tabpanel-dosm" aria-labelledby="tab-dosm">
        {sampleScoped && <p className="jx-scope-note" role="note" data-testid="text-dosm-scope-note"><Info size={14} aria-hidden="true" />{DOSM_SCOPE_NOTE}</p>}
        {dosmData && <p className="jobs-profile-note jx-note">Official DOSM employment · {dosmData.occupationSource.referenceYear} · counts are for the whole broad group</p>}
        {dosmLoading && !dosmError && <div className="dosm-occupation-grid" role="status" aria-label="Loading DOSM groups" data-testid="status-dosm-loading">{[1, 2].map(i => <div className="job-skeleton panel" key={i}><i /><i /><i /></div>)}</div>}
        {dosmError && <div className="dosm-occupation-error" role="alert" data-testid="status-dosm-error">
          <span>{matchOnly && scoreState.status === 'error' ? 'Profile match scores are needed to narrow DOSM groups and could not be calculated.' : 'Official DOSM labour-market data or the sample catalogue could not be loaded. Partial results are not shown.'}</span>
          <button className="text-link" onClick={() => { void dosmCatalogue.refetch(); if (filters.q) void dosmSearch.refetch(); if (jobsQuery.isError) void jobsQuery.refetch(); if (scoreState.status === 'error') setRetryTick(t => t + 1); }} data-testid="button-retry-dosm-occupation">Retry</button>
        </div>}
        {dosmData && !dosmLoading && !dosmError && (dosmGroups.length > 0
          ? <div className="dosm-occupation-grid" data-testid="list-dosm-occupation-results">{dosmGroups.map(g => <DosmGroupCard key={g.code} group={g} data={dosmData} />)}</div>
          : <div className="jobs-state panel" data-testid="status-dosm-occupation-empty">
            <span className="jobs-state-icon"><Search size={18} /></span>
            <h3>No DOSM occupation groups match.</h3>
            <p>Try clearing filters or a broader word. The title lookup covers a reviewed MyCOL subset, not every job title.</p>
            {emptyHelp}
          </div>)}
        {dosmData && <DosmSourcesDetails data={dosmData} />}
      </div>}
    </section>}
  </div>;
}

export default JobSearchPage;
