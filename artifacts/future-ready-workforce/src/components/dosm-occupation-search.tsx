import { useEffect, useState, type ReactNode } from "react";
import { Info, Search, UsersRound } from "lucide-react";
import { useGetDosmOccupationEmploymentSearch } from "@workspace/api-client-react";

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatPeople(thousands: number) {
  return Math.round(thousands * 1_000).toLocaleString("en-MY");
}

function formatMonth(date: string) {
  const month = date.slice(0, 7);
  const parsed = new Date(`${month}-01T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? month
    : parsed.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="dosm-occupation-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function DosmOccupationSearch({ keyword, onKeywordChange, filters }: {
  keyword: string;
  onKeywordChange: (value: string) => void;
  filters?: ReactNode;
}) {
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 300);
  const query = useGetDosmOccupationEmploymentSearch({ q: debouncedKeyword || undefined });
  const groups = query.data?.occupationGroups ?? [];
  const latest = query.data?.nationalContext.latestObservation;

  return (
    <section className="dosm-occupation-search panel" aria-labelledby="dosm-occupation-title" data-testid="panel-dosm-occupation-search">
      {query.data && latest && (
        <section className="dosm-occupation-national" aria-labelledby="dosm-national-title" data-testid="panel-dosm-national-context">
          <div className="dosm-occupation-national-heading">
            <div>
              <h3 id="dosm-national-title">Malaysia-wide context</h3>
              <p>All occupations · {formatMonth(latest.date)}</p>
            </div>
            <a className="text-link" href={query.data.nationalContext.metadata.sourceUrl} target="_blank" rel="noreferrer">OpenDOSM source</a>
          </div>
          {query.data.nationalContext.isStale && query.data.nationalContext.warning && (
            <p className="dosm-occupation-warning" role="status">{query.data.nationalContext.warning}</p>
          )}
          <div className="dosm-occupation-stats">
            <StatCard label="People employed" value={formatPeople(latest.employedThousands)} />
            <StatCard label="People unemployed" value={formatPeople(latest.unemployedThousands)} />
            <StatCard label="Unemployment rate" value={`${latest.unemploymentRate.toFixed(1)}%`} />
            <StatCard label="Employment-to-population ratio" value={`${latest.employmentPopulationRatio.toFixed(1)}%`} />
          </div>
          <p className="dosm-occupation-rate-explainer">National figures, not rates for a specific job.</p>
          <details className="dosm-occupation-methodology">
            <summary>About these rates</summary>
            <p>The national unemployment rate is unemployed people divided by the labour force. The employment-to-population ratio is the share of the working-age population that is employed. Neither is a rate for the searched job.</p>
          </details>
        </section>
      )}
      <div className="dosm-occupation-heading">
        <div className="dosm-occupation-icon" aria-hidden="true"><UsersRound size={18} /></div>
        <div>
          <div className="eyebrow">Occupation data & sample listings</div>
          <h2 id="dosm-occupation-title">Search an occupation</h2>
          <p>Search occupations and sample job listings together. Refine the listings using the filters below.</p>
        </div>
      </div>

      <label className="dosm-occupation-input">
        <Search size={17} aria-hidden="true" />
        <input
          value={keyword}
          onChange={event => onKeywordChange(event.target.value)}
          maxLength={100}
          placeholder="Try Software Engineer, Data Analyst, or Professionals"
          aria-label="Search occupations and sample job listings"
          data-testid="input-dosm-occupation-search"
        />
        {keyword && (
          <button type="button" className="search-clear" onClick={() => onKeywordChange("")} aria-label="Clear occupation search">
            ×
          </button>
        )}
      </label>

      {filters}

      <div className="dosm-occupation-scope" role="note">
        <Info size={16} aria-hidden="true" />
        <span>
          DOSM reports employed people by broad occupation group, not by individual job title. Search titles are from the project’s reviewed MyCOL subset; the number on a result is for the entire DOSM group.
        </span>
      </div>

      {query.isPending && <p className="small muted" role="status">Loading verified DOSM labour-market data…</p>}
      {query.isError && (
        <div className="dosm-occupation-error" role="alert">
          <span>Official DOSM labour-market data could not be loaded.</span>
          <button className="text-link" onClick={() => { void query.refetch(); }} data-testid="button-retry-dosm-occupation">Retry</button>
        </div>
      )}

      {query.data && latest && (
        <>
          <div className="dosm-occupation-results-heading">
            <div>
              <h3>{debouncedKeyword ? `Results for “${debouncedKeyword}”` : "Search results"}</h3>
              <span>{debouncedKeyword ? `${groups.length} occupation ${groups.length === 1 ? "group" : "groups"} matched` : "Enter a keyword to find an occupation group"}</span>
            </div>
            <span className="dosm-occupation-data-year">DOSM employment · {query.data.occupationSource.referenceYear}</span>
          </div>

          {debouncedKeyword && groups.length > 0 && (
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
                    <p className="dosm-occupation-card-note">
                      This is not an estimate for the individual title. DOSM does not publish an unemployment count or employment rate for this occupation group.
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          {debouncedKeyword && groups.length === 0 && (
            <div className="dosm-occupation-empty" data-testid="status-dosm-occupation-empty">
              <strong>No mapped occupation title or group matched.</strong>
              <span>Try a title in the reviewed MyCOL subset or one of the DOSM major-group names. This title lookup is not a complete job-title index.</span>
            </div>
          )}

          <details className="dosm-occupation-methodology">
            <summary>Sources, coverage and how to read these numbers</summary>
            <dl>
              <dt>Employment by occupation</dt>
              <dd>
                <a className="text-link" href={query.data.occupationSource.sourceUrl} target="_blank" rel="noreferrer">
                  {query.data.occupationSource.sourceName}
                </a>
                {" · "}{query.data.occupationSource.table}. The table reports annual counts in thousands for {query.data.occupationSource.classification}; the latest year shown is {query.data.occupationSource.referenceYear}.
              </dd>
              <dt>Job-title lookup</dt>
              <dd>
                <a className="text-link" href={query.data.titleSearchSource.url} target="_blank" rel="noreferrer">
                  {query.data.titleSearchSource.edition} · {query.data.titleSearchSource.publisher}
                </a>
                {" · "}{query.data.titleSearchSource.recordsInSearchIndex} reviewed occupation records are searchable here, compared with {query.data.titleSearchSource.totalOccupationsListed} listed in the source. {query.data.titleSearchSource.scopeNote}
              </dd>
              <dt>Unemployment and rates</dt>
              <dd>
                <a className="text-link" href={query.data.nationalContext.metadata.sourceUrl} target="_blank" rel="noreferrer">DOSM OpenDOSM monthly Labour Force Survey</a>
                {" · "}These are current Malaysia-wide totals. DOSM’s occupation table does not provide unemployment by occupation or a job-specific employment rate.
              </dd>
            </dl>
          </details>
        </>
      )}
    </section>
  );
}
