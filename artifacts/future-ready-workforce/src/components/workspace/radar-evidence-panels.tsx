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

type Ui = (source: string, vars?: Record<string, string | number>) => string;

function announcementFailureDetails(error: unknown, ui: Ui) {
  const data = error && typeof error === "object" && "data" in error ? error.data : null;
  const details = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const sourceStatus = typeof details.sourceStatus === "number" ? details.sourceStatus : null;
  const retryAfterSeconds = typeof details.retryAfterSeconds === "number" ? details.retryAfterSeconds : null;
  const retryMinutes = retryAfterSeconds === null ? null : Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return {
    message: sourceStatus === 503
      ? retryMinutes === null
        ? ui("The Ministry of Digital listing returned HTTP 503. It asked automated readers to wait before trying again. No announcement was invented or substituted.")
        : ui("The Ministry of Digital listing returned HTTP 503. It asked automated readers to wait about {minutes} minutes before trying again. No announcement was invented or substituted.", { minutes: retryMinutes })
      : ui("The official Ministry of Digital listing could not be reached. No announcement was invented or substituted."),
    retryAfterSeconds,
  };
}

const fmtDate = (date: string, tag = "en-MY") =>
  new Date(`${date}T00:00:00`).toLocaleDateString(tag, { day: "numeric", month: "short", year: "numeric" });
const fmtTimestamp = (value: string, tag = "en-MY") =>
  new Date(value).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" });

import { useI18n } from '@/i18n/i18n-context';
import { intlLocale } from '@/i18n/locales';

export function AiAnnouncementsPanel() {
  const { ui, t, locale } = useI18n();
  const tag = intlLocale(locale);
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
            {ui(refresh.isPending ? "Refreshing…" : "Refresh announcements")}
          </button>
        }
      />
      {refresh.isError && (
        <div role="alert" className="state-box" style={{ marginBottom: 12 }} data-testid="error-announcements-refresh">
          {ui('Refresh failed.')} {announcementFailureDetails(refresh.error, ui).message} {ui('Earlier retrieved data, if any, is kept below.')}
          <p><a href={OFFICIAL_ANNOUNCEMENTS_URL} target="_blank" rel="noopener noreferrer">{ui('Open the official Ministry of Digital announcements page')}</a></p>
        </div>
      )}
      {refresh.isSuccess && !refresh.data.isStale && (
        <div role="status" className="small muted" style={{ marginBottom: 12 }}>
          {ui('Retrieved from the Ministry of Digital page at {time}.', { time: fmtTimestamp(refresh.data.retrievedAt, tag) })}
        </div>
      )}
      {query.isPending && <LoadingBlock rows={2} />}
      {query.isError && (
        <div data-testid="error-announcements-source">
          <ErrorBlock message={announcementFailureDetails(query.error, ui).message} onRetry={() => { void query.refetch(); }} />
          <p className="small"><a href={OFFICIAL_ANNOUNCEMENTS_URL} target="_blank" rel="noopener noreferrer">{ui('Open the official Ministry of Digital announcements page')}</a></p>
        </div>
      )}
      {data && (
        <>
          {(data.isStale || query.isError) && (
            <div role="alert" className="state-box" style={{ marginBottom: 12 }} data-testid="stale-announcements">
              {ui(data.warning ?? (query.isError
                ? "The latest refresh failed. Showing the previously retrieved announcements."
                : "These announcements may be out of date."))}
            </div>
          )}
          {data.items.length === 0 ? (
            <EmptyBlock title={ui('No AI-related announcements found on the current listing page.')}>
              {ui('The page was read successfully, but no listed title mentions AI.')}
            </EmptyBlock>
          ) : (
            <div className="table-wrap">
              <table data-testid="table-ai-announcements">
                <caption className="sr-only">{ui('AI-related Ministry of Digital press releases')}</caption>
                <thead>
                  <tr><th>{ui('Published')}</th><th>{ui('Title')}</th><th>{ui('Type')}</th><th>{ui('Source')}</th></tr>
                </thead>
                <tbody>
                  {data.items.map(item => (
                    <tr key={item.url}>
                      <td className="mono">{fmtDate(item.publishedOn, tag)}</td>
                      <td><a className="text-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a></td>
                      <td>{item.category ?? ui("Not stated")}</td>
                      <td>{item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small muted" style={{ marginTop: 12 }}>
            {ui('Source:')}{" "}
            <a className="text-link" href={data.source.listingUrl} target="_blank" rel="noreferrer">{data.source.name}</a>
            {" · "}{ui('Retrieved {time}', { time: fmtTimestamp(data.retrievedAt, tag) })}
          </p>
          <details style={{ marginTop: 8 }}>
            <summary>{ui('Limitations')}</summary>
            {locale !== 'en' && <p className="small muted">{t('detail.sourceLanguage')}</p>}
            <ul className="warn-list">{data.limitations.map(item => <li key={item}>{item}</li>)}</ul>
          </details>
        </>
      )}
    </section>
  );
}

export function SkillFrequencyPanel() {
  const { ui, t, locale } = useI18n();
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
            <label htmlFor="freq-role">{ui('Role family')}</label>
            <select id="freq-role" className="fr-select" value={selected.roleFamily} onChange={e => setRole(e.target.value)} data-testid="select-frequency-role">
              {data.roles.map(item => <option key={item.roleFamily} value={item.roleFamily}>{item.roleFamily}</option>)}
            </select>
          </div>
          <p className="small muted">{ui('{count} postings in this role family · top {top} skills shown', { count: formatCompactCount(selected.rolePostings), top: selected.skills.length })}</p>
          <div className="stack" style={{ gap: 10 }}>
            {selected.skills.map(item => (
              <div key={item.skill} data-testid={`row-frequency-${item.skill}`}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{item.skill}</span>
                  <span className="mono">{ui('{percent}% · {count} postings', { percent: formatRate(item.percentOfRolePostings), count: formatCompactCount(item.postingsWithSkill) })}</span>
                </div>
                <Bar value={item.percentOfRolePostings} label={ui('{skill}: {percent}% of {role} postings', { skill: item.skill, percent: formatRate(item.percentOfRolePostings), role: selected.roleFamily })} />
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
            {data.source.citation}{" "}
            <span>{ui('Licence: {license}. Period: {period}.', { license: data.source.license, period: data.source.period })}</span>{" "}
            {data.source.urls.map((url, index) => (
              <a key={url} className="text-link" href={url} target="_blank" rel="noreferrer">{index > 0 ? " · " : ""}{ui('Source {n}', { n: index + 1 })}</a>
            ))}
          </p>
          <details style={{ marginTop: 8 }}>
            <summary>{ui('Limitations')}</summary>
            {locale !== 'en' && <p className="small muted">{t('detail.sourceLanguage')}</p>}
            <ul className="warn-list">
              {[...data.limitations, data.source.geographyNote, data.source.measurementNote].map(item => <li key={item}>{item}</li>)}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
