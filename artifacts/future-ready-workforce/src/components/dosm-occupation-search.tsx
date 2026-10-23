import { useEffect, useState, type ReactNode } from "react";
import { Info, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { useGetDosmOccupationEmploymentSearch } from "@workspace/api-client-react";
import { ExternalJobLinks } from "@/components/shared/external-job-links";
import "@/components/job-listings.css";
import { formatPeople } from "@/components/dosm-national-context";
import { useI18n } from "@/i18n/i18n-context";

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type Props = {
  keyword?: string;
  onKeywordChange?: (keyword: string) => void;
  children?: ReactNode;
};

export function DosmOccupationSearch({ keyword: sharedKeyword, onKeywordChange, children }: Props = {}) {
  const { ui, locale } = useI18n();
  const [localKeyword, setLocalKeyword] = useState("");
  const keyword = sharedKeyword ?? localKeyword;
  const setKeyword = onKeywordChange ?? setLocalKeyword;
  const combinedSearch = Boolean(onKeywordChange);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupCode, setGroupCode] = useState("");
  const [skill, setSkill] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 300);
  const query = useGetDosmOccupationEmploymentSearch({ q: debouncedKeyword || undefined });
  // Keep filter options stable when the search keyword changes.
  const catalogue = useGetDosmOccupationEmploymentSearch({});
  const allGroups = catalogue.data?.occupationGroups ?? query.data?.occupationGroups ?? [];
  const skillOptions = [...new Set(allGroups.flatMap(group => group.generalSkills))].sort((a, b) => a.localeCompare(b));
  const groups = (query.data?.occupationGroups ?? []).filter(group =>
    (!groupCode || group.code === groupCode) && (!skill || group.generalSkills.includes(skill)),
  );
  const activeFilters = Number(Boolean(groupCode)) + Number(Boolean(skill));
  const hasCriteria = Boolean(debouncedKeyword || activeFilters);
  const clearFilters = () => { setGroupCode(""); setSkill(""); };

  return (
    <section className="dosm-occupation-search panel" aria-labelledby="dosm-occupation-title" data-testid="panel-dosm-occupation-search">
      <div className="dosm-occupation-heading">
        <div className="dosm-occupation-icon" aria-hidden="true"><UsersRound size={18} /></div>
        <div>
          <div className="eyebrow">{combinedSearch ? "Careers & labour-market data" : "DOSM labour-market data"}</div>
          <h2 id="dosm-occupation-title">{combinedSearch ? "Search occupations & listings" : "Search an occupation"}</h2>
          <p>{combinedSearch ? "One search for sample listings and official DOSM occupation-group context." : "Find a listed job title or major occupation group, then see the employment count DOSM publishes for that group."}</p>
        </div>
      </div>

      <div className="dosm-search-controls">
      <label className="dosm-occupation-input">
        <Search size={17} aria-hidden="true" />
        <input
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          maxLength={100}
          placeholder={combinedSearch ? "Search title, occupation, MASCO code or skill — try data, nurse, cyber" : "Try Software Engineer, Data Analyst, or Professionals"}
          aria-label={combinedSearch ? "Search occupations and sample listings" : "Search DOSM occupation data by job title or group"}
          data-testid={combinedSearch ? "input-job-search" : "input-dosm-occupation-search"}
        />
        {keyword && (
          <button type="button" className="search-clear" onClick={() => setKeyword("")} aria-label={combinedSearch ? "Clear search" : "Clear occupation search"} data-testid={combinedSearch ? "button-clear-search" : undefined}>
            ×
          </button>
        )}
      </label>
      <button
        type="button"
        className={`jobs-filter-toggle${filtersOpen ? " open" : ""}`}
        onClick={() => setFiltersOpen(open => !open)}
        aria-label={`Occupation filters${activeFilters ? ` (${activeFilters} active)` : ""}`}
        aria-expanded={filtersOpen}
        aria-controls="dosm-occupation-filters"
        title="Filter occupation results"
        data-testid="button-occupation-filters"
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        {activeFilters > 0 && <span className="jobs-filter-count" aria-hidden="true">{activeFilters}</span>}
      </button>
      </div>
      {children}
      <div id="dosm-occupation-filters" className="dosm-filter-panel" hidden={!filtersOpen}>
        <div className="jobs-filter-heading">
          <span>{ui('Filter occupation results')}</span>
          {activeFilters > 0 && <button type="button" className="text-link" onClick={clearFilters} data-testid="button-clear-occupation-filters">{ui('Clear occupation filters')}</button>}
        </div>
        <div className="dosm-filter-fields">
          <label className="filter-block">
            <span className="jobs-filter-label">{ui('Occupation group')}</span>
            <select className="jobs-filter-input" value={groupCode} onChange={event => setGroupCode(event.target.value)} data-testid="select-occupation-group">
              <option value="">{ui('All occupation groups')}</option>
              {allGroups.map(group => <option value={group.code} key={group.code}>{group.label}</option>)}
            </select>
          </label>
          <label className="filter-block">
            <span className="jobs-filter-label">{ui('General skills for this group')}</span>
            <select className="jobs-filter-input" value={skill} onChange={event => setSkill(event.target.value)} data-testid="select-occupation-skill">
              <option value="">{ui('All general skills')}</option>
              {skillOptions.map(name => <option value={name} key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <p className="small muted">{ui('Filters combine with your search and apply only to occupation results. Skills match the reviewed group summaries shown below, not every skill required for a job.')}</p>
        {catalogue.isError && <p className="small" role="alert">{ui('Full filter options could not be loaded.')} <button type="button" className="text-link" onClick={() => { void catalogue.refetch(); }}>{ui('Retry filter options')}</button></p>}
      </div>
      {activeFilters > 0 && !filtersOpen && <p className="small muted">{activeFilters} occupation {activeFilters === 1 ? "filter" : "filters"} active · <button type="button" className="text-link" onClick={clearFilters}>Clear occupation filters</button></p>}

      <div className="dosm-occupation-scope" role="note">
        <Info size={16} aria-hidden="true" />
        <span>
          {ui('DOSM reports employed people by broad occupation group, not by individual job title. Search titles are from the project’s reviewed MyCOL subset; the number on a result is for the entire DOSM group.')}
        </span>
      </div>

      {query.isPending && <p className="small muted" role="status">{ui('Loading verified DOSM labour-market data…')}</p>}
      {query.isError && (
        <div className="dosm-occupation-error" role="alert">
          <span>{ui('Official DOSM labour-market data could not be loaded.')}</span>
          <button className="text-link" onClick={() => { void query.refetch(); }} data-testid="button-retry-dosm-occupation">Retry</button>
        </div>
      )}

      {query.data && (
        <>
          <div className="dosm-occupation-results-heading">
            <div>
              <h3>{combinedSearch ? ui('DOSM occupation context') : debouncedKeyword ? ui('Results for “{keyword}”', { keyword: debouncedKeyword }) : ui('Search results')}</h3>
              <span role="status" aria-live="polite">{hasCriteria ? `${groups.length} ${ui(groups.length === 1 ? '{count} occupation group matched' : '{count} occupation groups matched', { count: groups.length })}${activeFilters ? ui(' with filters') : ''}` : ui('Enter a keyword or choose a filter to find an occupation group')}</span>
            </div>
            <span className="dosm-occupation-data-year">DOSM {ui('employment')} · {query.data.occupationSource.referenceYear}</span>
          </div>

          {hasCriteria && groups.length > 0 && (
            <div className="dosm-occupation-grid" data-testid="list-dosm-occupation-results">
              {groups.map(group => {
                const matchedNames = group.matchedJobTitles.length > 0
                  ? group.matchedJobTitles
                  : group.matchedOccupationTitles;
                return (
                  <article className="dosm-occupation-card" key={group.code} data-testid={`card-dosm-occupation-${group.code}`}>
                    <div className="dosm-occupation-card-heading">
                      <div>
                        <h4>{group.label}</h4>
                        <span>MASCO major group {group.code}</span>
                      </div>
                      <span className="dosm-occupation-source-tag">DOSM</span>
                    </div>
                    {matchedNames.length > 0 && (
                      <p className="dosm-occupation-match">
                        Matched title{matchedNames.length === 1 ? "" : "s"}: <strong>{matchedNames.join(", ")}</strong>
                      </p>
                    )}
                    <div className="dosm-occupation-count">
                      <strong>{formatPeople(group.employedThousands)}</strong>
                      <span>people employed in this broad group in {query.data.occupationSource.referenceYear}</span>
                    </div>
                    <div className="dosm-group-skills" data-testid={`panel-group-skills-${group.code}`}>
                      <h5>General skills for this group</h5>
                      {group.generalSkills.length > 0 ? (
                        <ul className="dosm-group-skill-list">
                          {group.generalSkills.map(skill => <li key={skill}>{skill}</li>)}
                        </ul>
                      ) : (
                        <p className="dosm-group-skill-empty" data-testid={`status-group-skills-empty-${group.code}`}>General skills are unavailable for this group in the reviewed subset.</p>
                      )}
                      <p className="dosm-group-skill-note">
                        {group.skillsCoverage} Group-level context from a reviewed MyCOL/O*NET subset; not requirements for every job in the group and not DOSM skill data.
                      </p>
                      {group.skillSourceUrls.length > 0 && (
                        <details className="dosm-group-skill-sources">
                          <summary>Skill sources ({group.skillSourceUrls.length})</summary>
                          <ul>
                            {group.skillSourceUrls.map((url, i) => <li key={url}><a className="text-link" href={url} target="_blank" rel="noopener noreferrer" data-testid={`link-group-skill-source-${group.code}-${i}`}>{url}</a></li>)}
                          </ul>
                        </details>
                      )}
                    </div>
                    {(matchedNames.length > 0 ? matchedNames : [group.label]).map((title, i) => (
                      <div key={title} data-testid={`panel-real-jobs-${group.code}-${i}`}>
                        <p className="ext-jobs-title">Real vacancies for {title}</p>
                        <ExternalJobLinks occupationTitle={title} testIdSuffix={`dosm-${group.code}-${i}`} compact />
                      </div>
                    ))}
                    <p className="dosm-occupation-card-note">
                      This is not an estimate for the individual title. DOSM does not publish an unemployment count or employment rate for this occupation group.
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          {hasCriteria && groups.length === 0 && (
            <div className="dosm-occupation-empty" data-testid="status-dosm-occupation-empty">
              <strong>{activeFilters ? "No occupation groups match this search and these filters." : "No mapped occupation title or group matched."}</strong>
              {activeFilters > 0 && <button type="button" className="text-link" onClick={clearFilters}>Clear occupation filters</button>}
              <span>Try a title in the reviewed MyCOL subset or one of the DOSM major-group names. This title lookup is not a complete job-title index.</span>
            </div>
          )}

          <details className="dosm-occupation-methodology">
            <summary>Sources, coverage and how to read these numbers</summary>
            <dl>
              <dt>Employment by occupation</dt>
              <dd>
                <a className="text-link" href={query.data.occupationSource.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {query.data.occupationSource.sourceName}
                </a>
                {" · "}{query.data.occupationSource.table}. The table reports annual counts in thousands for {query.data.occupationSource.classification}; the latest year shown is {query.data.occupationSource.referenceYear}.
              </dd>
              <dt>Job-title lookup</dt>
              <dd>
                <a className="text-link" href={query.data.titleSearchSource.url} target="_blank" rel="noopener noreferrer">
                  {query.data.titleSearchSource.edition} · {query.data.titleSearchSource.publisher}
                </a>
                {" · "}{query.data.titleSearchSource.recordsInSearchIndex} reviewed occupation records are searchable here, compared with {query.data.titleSearchSource.totalOccupationsListed} listed in the source. {query.data.titleSearchSource.scopeNote}
              </dd>
              <dt>Unemployment and rates</dt>
              <dd>
                <a className="text-link" href={query.data.nationalContext.metadata.sourceUrl} target="_blank" rel="noopener noreferrer">DOSM OpenDOSM monthly Labour Force Survey</a>
                {" · "}These are current Malaysia-wide totals. DOSM’s occupation table does not provide unemployment by occupation or a job-specific employment rate.
              </dd>
            </dl>
          </details>
        </>
      )}
    </section>
  );
}
