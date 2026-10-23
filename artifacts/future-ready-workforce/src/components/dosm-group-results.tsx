import type { DosmOccupationEmploymentSearchResponse } from "@workspace/api-client-react";
import { ExternalJobLinks } from "@/components/shared/external-job-links";
import { formatPeople } from "@/components/dosm-national-context";
import type { DosmKeywordGroup } from "@/domain/job-listing-filters";
import { useI18n } from "@/i18n/i18n-context";
import "@/components/job-listings.css";

type Source = DosmOccupationEmploymentSearchResponse;

/** One official DOSM major-group card. Numbers are shown exactly as published for the whole group. */
export function DosmGroupCard({ group, data }: { group: DosmKeywordGroup; data: Source }) {
  const { ui, locale } = useI18n();
  const matchedNames = group.matchedJobTitles.length > 0 ? group.matchedJobTitles : group.matchedOccupationTitles;
  return (
    <article className="dosm-occupation-card" data-testid={`card-dosm-occupation-${group.code}`}>
      <div className="dosm-occupation-card-heading">
        <div>
          <h4>{group.label}</h4>
          <span>MASCO {ui('major group')} {group.code}</span>
        </div>
        <span className="dosm-occupation-source-tag">DOSM</span>
      </div>
      {matchedNames.length > 0 && (
        <p className="dosm-occupation-match">
          {ui(matchedNames.length === 1 ? 'Matched title:' : 'Matched titles:')} <strong>{matchedNames.join(", ")}</strong>
        </p>
      )}
      {group.matchedVia.length > 0 && (
        <p className="dosm-matched-via" data-testid={`text-dosm-matched-via-${group.code}`}>{ui('Matched by')} {group.matchedVia.join(", ")}</p>
      )}
      <div className="dosm-occupation-count">
        <strong data-testid={`text-dosm-employed-${group.code}`}>{formatPeople(group.employedThousands, locale)}</strong>
        <span>{ui('people employed in this broad group in {year}', { year: data.occupationSource.referenceYear })}</span>
      </div>
      <div className="dosm-group-skills" data-testid={`panel-group-skills-${group.code}`}>
        <h5>{ui('General skills for this group')}</h5>
        {group.generalSkills.length > 0 ? (
          <ul className="dosm-group-skill-list">{group.generalSkills.map(s => <li key={s}>{s}</li>)}</ul>
        ) : (
          <p className="dosm-group-skill-empty" data-testid={`status-group-skills-empty-${group.code}`}>{ui('General skills are unavailable for this group in the reviewed subset.')}</p>
        )}
        <p className="dosm-group-skill-note">
          {group.skillsCoverage} {ui('Group-level context from a reviewed MyCOL/O*NET subset; not requirements for every job in the group and not DOSM skill data.')}
        </p>
        {group.skillSourceUrls.length > 0 && (
          <details className="dosm-group-skill-sources">
            <summary>{ui('Skill sources ({count})', { count: group.skillSourceUrls.length })}</summary>
            <ul>
              {group.skillSourceUrls.map((url, i) => <li key={url}><a className="text-link" href={url} target="_blank" rel="noopener noreferrer" data-testid={`link-group-skill-source-${group.code}-${i}`}>{url}</a></li>)}
            </ul>
          </details>
        )}
      </div>
      {(matchedNames.length > 0 ? matchedNames : [group.label]).map((title, i) => (
        <div key={title} data-testid={`panel-real-jobs-${group.code}-${i}`}>
          <p className="ext-jobs-title">{ui('Real vacancies for {title}', { title })}</p>
          <ExternalJobLinks occupationTitle={title} testIdSuffix={`dosm-${group.code}-${i}`} compact />
        </div>
      ))}
      <p className="dosm-occupation-card-note">
        {ui('This is not an estimate for the individual title. DOSM does not publish an unemployment count or employment rate for this occupation group.')}
      </p>
    </article>
  );
}

/** Collapsed sources, coverage and reading guide. */
export function DosmSourcesDetails({ data }: { data: Source }) {
  const { ui } = useI18n();
  return (
    <details className="dosm-occupation-methodology" data-testid="details-dosm-sources">
      <summary>{ui('Sources, coverage and how to read these numbers')}</summary>
      <dl>
          <dt>{ui('Employment by occupation')}</dt>
        <dd>
          <a className="text-link" href={data.occupationSource.sourceUrl} target="_blank" rel="noopener noreferrer">{data.occupationSource.sourceName}</a>
          {" · "}{data.occupationSource.table}. The table reports annual counts in thousands for {data.occupationSource.classification}; the latest year shown is {data.occupationSource.referenceYear}.
        </dd>
        <dt>Job-title lookup</dt>
        <dd>
          <a className="text-link" href={data.titleSearchSource.url} target="_blank" rel="noopener noreferrer">{data.titleSearchSource.edition} · {data.titleSearchSource.publisher}</a>
          {" · "}{data.titleSearchSource.recordsInSearchIndex} reviewed occupation records are searchable here, compared with {data.titleSearchSource.totalOccupationsListed} listed in the source. {data.titleSearchSource.scopeNote}
        </dd>
          <dt>{ui('Unemployment and rates')}</dt>
        <dd>
          <a className="text-link" href={data.nationalContext.metadata.sourceUrl} target="_blank" rel="noopener noreferrer">DOSM OpenDOSM monthly Labour Force Survey</a>
          {" · "}These are current Malaysia-wide totals. DOSM’s occupation table does not provide unemployment by occupation or a job-specific employment rate.
        </dd>
        <dt>Shared filters</dt>
        <dd>Occupation and group filters use the first digit of the 4-digit MASCO code. Skill, SDG and “Matches my skills” narrow which groups appear using reviewed group skills and mapped sample-listing evidence; they never change the DOSM counts. Keyword matches beyond DOSM/MyCOL titles are labelled on each card.</dd>
      </dl>
    </details>
  );
}
