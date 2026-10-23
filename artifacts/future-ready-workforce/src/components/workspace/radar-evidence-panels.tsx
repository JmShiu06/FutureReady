import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAiAnnouncementsQueryKey,
  useGetAiAnnouncements,
  useGetSkillFrequencies,
  useRefreshAiAnnouncements,
} from "@workspace/api-client-react";
import { RefreshCw } from "lucide-react";
import { Bar, EmptyBlock, ErrorBlock, LoadingBlock, SectionTitle } from "@/components/workspace/ui";
import { formatCompactCount, formatRate } from "@/domain/formatting";

const OFFICIAL_ANNOUNCEMENTS_URL = "https://www.digital.gov.my/en-GB/siaran";

function announcementFailureDetails(error: unknown) {
  const data = error && typeof error === "object" && "data" in error ? error.data : null;
  const details = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const sourceStatus = typeof details.sourceStatus === "number" ? details.sourceStatus : null;
  const retryAfterSeconds = typeof details.retryAfterSeconds === "number" ? details.retryAfterSeconds : null;
  const retryMinutes = retryAfterSeconds === null ? null : Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return {
    message: sourceStatus === 503
      ? `The Ministry of Digital listing returned HTTP 503. It asked automated readers to wait${retryMinutes === null ? " before trying again" : ` about ${retryMinutes} minutes before trying again`}. No announcement was invented or substituted.`
      : "The official Ministry of Digital listing could not be reached. No announcement was invented or substituted.",
    retryAfterSeconds,
  };
}

const fmtDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
const fmtTimestamp = (value: string) =>
  new Date(value).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });

import { useI18n } from '@/i18n/i18n-context';

export function AiAnnouncementsPanel() {
  const { ui } = useI18n();
  const queryClient = useQueryClient();
  const query = useGetAiAnnouncements({
    query: { queryKey: getGetAiAnnouncementsQueryKey(), retry: false, refetchOnWindowFocus: false },
  });
  const refresh = useRefreshAiAnnouncements();
  const data = query.data;

  return (
    <section className="panel panel-pad" style={{ minWidth: 0 }} data-testid="panel-ai-announcements">
      <SectionTitle
        title={ui('AI-related government announcements')}
        note="MINISTRY OF DIGITAL · QUALITATIVE CONTEXT"
        info={ui('Dated press releases that mention AI. They show policy and programme activity; they are not measurements of skill demand and are not turned into scores or forecasts.')}
        action={
          <button
            className="btn btn-secondary btn-small"
            disabled={refresh.isPending}
            onClick={() =>
              refresh.mutate(undefined, {
                onSuccess: next => queryClient.setQueryData(getGetAiAnnouncementsQueryKey(), next),
                onError: () => {
                  queryClient.setQueryData(getGetAiAnnouncementsQueryKey(), (previous: typeof data) =>
                    previous
                      ? {
                          ...previous,
                          isStale: true,
                          warning: "The latest refresh failed. Showing the previously retrieved announcements.",
                        }
                      : previous,
                  );
                },
              })
            }
            data-testid="button-refresh-announcements"
          >
            <RefreshCw size={14} className={refresh.isPending ? "spin" : undefined} />
            {refresh.isPending ? "Refreshing…" : "Refresh announcements"}
          </button>
        }
      />
      {refresh.isError && (
        <div role="alert" className="state-box" style={{ marginBottom: 12 }} data-testid="error-announcements-refresh">
          {ui('Refresh failed.')} {ui(announcementFailureDetails(refresh.error).message)} {ui('Earlier retrieved data, if any, is kept below.')}
          <p><a href={OFFICIAL_ANNOUNCEMENTS_URL} target="_blank" rel="noopener noreferrer">{ui('Open the official Ministry of Digital announcements page')}</a></p>
        </div>
      )}
      {refresh.isSuccess && !refresh.data.isStale && (
        <div role="status" className="small muted" style={{ marginBottom: 12 }}>
          Retrieved from the Ministry of Digital page at {fmtTimestamp(refresh.data.retrievedAt)}.
        </div>
      )}
      {query.isPending && <LoadingBlock rows={2} />}
      {query.isError && (
        <div data-testid="error-announcements-source">
          <ErrorBlock message={announcementFailureDetails(query.error).message} onRetry={() => { void query.refetch(); }} />
          <p className="small"><a href={OFFICIAL_ANNOUNCEMENTS_URL} target="_blank" rel="noopener noreferrer">{ui('Open the official Ministry of Digital announcements page')}</a></p>
        </div>
      )}
      {data && (
        <>
          {(data.isStale || query.isError) && (
            <div role="alert" className="state-box" style={{ marginBottom: 12 }} data-testid="stale-announcements">
              {data.warning ?? (query.isError
                ? "The latest refresh failed. Showing the previously retrieved announcements."
                : "These announcements may be out of date.")}
            </div>
          )}
          {data.items.length === 0 ? (
            <EmptyBlock title={ui('No AI-related announcements found on the current listing page.')}>
              {ui('The page was read successfully, but no listed title mentions AI.')}
            </EmptyBlock>
          ) : (
            <div className="table-wrap">
              <table data-testid="table-ai-announcements">
                <caption className="sr-only">AI-related Ministry of Digital press releases</caption>
                <thead>
                  <tr><th>Published</th><th>Title</th><th>Type</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {data.items.map(item => (
                    <tr key={item.url}>
                      <td className="mono">{fmtDate(item.publishedOn)}</td>
                      <td><a className="text-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a></td>
                      <td>{item.category ?? "Not stated"}</td>
                      <td>{item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small muted" style={{ marginTop: 12 }}>
            Source:{" "}
            <a className="text-link" href={data.source.listingUrl} target="_blank" rel="noreferrer">{data.source.name}</a>
            {" · "}Retrieved {fmtTimestamp(data.retrievedAt)}
          </p>
          <details style={{ marginTop: 8 }}>
            <summary>Limitations</summary>
            <ul className="warn-list">{data.limitations.map(item => <li key={item}>{item}</li>)}</ul>
          </details>
        </>
      )}
    </section>
  );
}

export function SkillFrequencyPanel() {
  const { ui } = useI18n();
  const query = useGetSkillFrequencies();
  const [role, setRole] = useState("");
  const data = query.data;
  const selected = data?.roles.find(item => item.roleFamily === role) ?? data?.roles[0];

  return (
    <section className="panel panel-pad" style={{ minWidth: 0 }} data-testid="panel-skill-frequencies">
      <SectionTitle
        title={ui('Global skill mentions in job postings')}
        note="QARERA DATASET · SNAPSHOT, NOT A TREND"
        info={ui('Share of postings in a role family that mention each skill. This is a global snapshot for one period, not Malaysian demand and not growth.')}
      />
      {query.isPending && <LoadingBlock rows={2} />}
      {query.isError && <ErrorBlock message={ui('Skill frequencies could not be loaded.')} onRetry={() => { void query.refetch(); }} />}
      {data && selected && (
        <>
          <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
            <label htmlFor="freq-role">Role family</label>
            <select id="freq-role" className="fr-select" value={selected.roleFamily} onChange={e => setRole(e.target.value)} data-testid="select-frequency-role">
              {data.roles.map(item => <option key={item.roleFamily} value={item.roleFamily}>{item.roleFamily}</option>)}
            </select>
          </div>
          <p className="small muted">{formatCompactCount(selected.rolePostings)} postings in this role family · top {selected.skills.length} skills shown</p>
          <div className="stack" style={{ gap: 10 }}>
            {selected.skills.map(item => (
              <div key={item.skill} data-testid={`row-frequency-${item.skill}`}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{item.skill}</span>
                  <span className="mono">{formatRate(item.percentOfRolePostings)}% · {formatCompactCount(item.postingsWithSkill)} postings</span>
                </div>
                <Bar value={item.percentOfRolePostings} label={`${item.skill}: ${formatRate(item.percentOfRolePostings)}% of ${selected.roleFamily} postings`} />
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
            {data.source.citation}{" "}
            <span>Licence: {data.source.license}. Period: {data.source.period}.</span>{" "}
            {data.source.urls.map((url, index) => (
              <a key={url} className="text-link" href={url} target="_blank" rel="noreferrer">{index > 0 ? " · " : ""}Source {index + 1}</a>
            ))}
          </p>
          <details style={{ marginTop: 8 }}>
            <summary>Limitations</summary>
            <ul className="warn-list">
              {[...data.limitations, data.source.geographyNote, data.source.measurementNote].map(item => <li key={item}>{item}</li>)}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
