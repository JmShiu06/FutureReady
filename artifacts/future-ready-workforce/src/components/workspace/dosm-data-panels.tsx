import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDosmLabourForceQueryKey,
  useGetDosmJobMarketInsights,
  useGetDosmLabourForce,
  useRefreshDosmLabourForce,
} from "@workspace/api-client-react";
import type {
  DosmJobMarketInsightsResponse,
  GetDosmLabourForceParams,
} from "@workspace/api-client-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { EmptyBlock, ErrorBlock, LoadingBlock, SectionTitle } from "@/components/workspace/ui";

type RateMetric = "unemploymentRate" | "participationRate" | "employmentPopulationRatio";

const rateOptions: { value: RateMetric; label: string }[] = [
  { value: "unemploymentRate", label: "Unemployment rate" },
  { value: "participationRate", label: "Labour-force participation rate" },
  { value: "employmentPopulationRatio", label: "Employment-to-population ratio" },
];

const fmtCount = (value: number) =>
  value.toLocaleString("en-MY", { maximumFractionDigits: 1 });

const fmtMonth = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
    month: "short",
    year: "numeric",
  });

const fmtDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtTimestamp = (date: string) =>
  new Date(date).toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function sourceLinks(
  metadata: Pick<DosmJobMarketInsightsResponse, "sourceUrl" | "termsUrl" | "attribution">,
) {
  return (
    <p className="small muted" style={{ lineHeight: 1.7 }}>
      {metadata.attribution}{" "}
      <a className="text-link" href={metadata.sourceUrl} target="_blank" rel="noreferrer">
        DOSM release
      </a>{" "}
      ·{" "}
      <a className="text-link" href={metadata.termsUrl} target="_blank" rel="noreferrer">
        Terms of Use
      </a>
    </p>
  );
}

export function DosmDataPanels() {
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [metric, setMetric] = useState<RateMetric>("unemploymentRate");
  const queryClient = useQueryClient();
  const queryParams: GetDosmLabourForceParams = {
    fromMonth: fromMonth || undefined,
    toMonth: toMonth || undefined,
  };
  const labourForceQuery = useGetDosmLabourForce(queryParams);
  const jobMarketQuery = useGetDosmJobMarketInsights();
  const refreshMutation = useRefreshDosmLabourForce();

  const observationRows = labourForceQuery.data?.observations ?? [];
  const latest = observationRows.at(-1);
  const selectedMetricLabel = rateOptions.find(option => option.value === metric)?.label ?? "Rate";
  const invalidRange = Boolean(fromMonth && toMonth && fromMonth > toMonth);

  return (
    <div className="stack dosm-data-panels" style={{ gap: 18, marginBottom: 22, minWidth: 0 }}>
      <section className="panel panel-pad" style={{ minWidth: 0 }} data-testid="panel-dosm-labour-force">
        <SectionTitle
          title="Monthly labour-force context"
          note="OFFICIAL DOSM · NATIONAL SERIES"
          info="These are national Labour Force Survey indicators. They provide broad labour-market context and do not measure vacancies, occupation demand, or skills."
          action={
            <button
              className="btn btn-secondary btn-small"
              onClick={() =>
                refreshMutation.mutate(undefined, {
                  onSuccess: () =>
                    queryClient.invalidateQueries({
                      queryKey: getGetDosmLabourForceQueryKey(),
                    }),
                })
              }
              disabled={refreshMutation.isPending}
              title="Refreshes the monthly OpenDOSM series only"
              data-testid="button-refresh-dosm"
            >
              <RefreshCw size={14} className={refreshMutation.isPending ? "spin" : undefined} />
              {refreshMutation.isPending ? "Refreshing…" : "Refresh monthly data"}
            </button>
          }
        />

        <p className="muted" style={{ marginTop: 0 }}>
          Counts are reported in thousands of people; rates are percentages. This national series is
          kept separate from occupation postings and other evidence panels. It is not skill demand.
        </p>

        <div
          className="form-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", marginBottom: 14 }}
        >
          <div className="field">
            <label htmlFor="dosm-from-month">From month</label>
            <input
              id="dosm-from-month"
              type="month"
              className="fr-input"
              value={fromMonth}
              onChange={event => setFromMonth(event.target.value)}
              data-testid="input-dosm-from-month"
            />
          </div>
          <div className="field">
            <label htmlFor="dosm-to-month">To month</label>
            <input
              id="dosm-to-month"
              type="month"
              className="fr-input"
              value={toMonth}
              onChange={event => setToMonth(event.target.value)}
              data-testid="input-dosm-to-month"
            />
          </div>
          <div className="field">
            <label htmlFor="dosm-rate-metric">Chart metric</label>
            <select
              id="dosm-rate-metric"
              className="fr-select"
              value={metric}
              onChange={event => setMetric(event.target.value as RateMetric)}
              data-testid="select-dosm-metric"
            >
              {rateOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {invalidRange && (
          <div role="alert" className="state-box" style={{ marginBottom: 12 }}>
            The start month must not be after the end month.
          </div>
        )}
        {refreshMutation.isError && (
          <div role="alert" className="state-box" style={{ marginBottom: 12 }}>
            Refresh failed. Existing cached data was kept.{" "}
            {refreshMutation.error instanceof Error ? refreshMutation.error.message : ""}
          </div>
        )}
        {refreshMutation.isSuccess && (
          <div role="status" className="small muted" style={{ marginBottom: 12 }}>
            OpenDOSM returned {refreshMutation.data.observationsLoaded} validated monthly records;
            latest observation {fmtMonth(refreshMutation.data.latestObservationDate)}.
          </div>
        )}

        {labourForceQuery.isPending && <LoadingBlock rows={2} />}
        {labourForceQuery.isError && (
          <ErrorBlock
            message="Official labour-force data could not be loaded."
            onRetry={() => { void labourForceQuery.refetch(); }}
          />
        )}
        {labourForceQuery.data && !invalidRange && (
          <>
            {labourForceQuery.data.isStale && (
              <div role="alert" className="state-box" style={{ marginBottom: 14 }}>
                {labourForceQuery.data.warning ?? "The displayed official data may be stale."}
              </div>
            )}

            {observationRows.length === 0 ? (
              <EmptyBlock title="No observations in this month range.">
                Choose a wider range or clear the month filters.
              </EmptyBlock>
            ) : (
              <>
                <p className="small muted" style={{ marginTop: 0 }} data-testid="text-dosm-reference-period">
                  Reference period: latest observation {fmtMonth(labourForceQuery.data.metadata.latestObservationDate)} ·
                  Retrieved from OpenDOSM {fmtTimestamp(labourForceQuery.data.metadata.retrievedAt)} ·
                  Publication date: not provided by the API.
                </p>
                {latest && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <MetricCard label="Labour force" value={fmtCount(latest.labourForceThousands)} note={`Thousands of people · ${fmtMonth(latest.date)}`} />
                    <MetricCard label="Unemployed" value={fmtCount(latest.unemployedThousands)} note="Thousands of people" />
                    <MetricCard label="Unemployment rate" value={`${fmtCount(latest.unemploymentRate)}%`} note="DOSM observed rate" />
                    <MetricCard label="Participation rate" value={`${fmtCount(latest.participationRate)}%`} note="DOSM observed rate" />
                  </div>
                )}

                <div className="panel chart-card" style={{ marginBottom: 16, minWidth: 0 }}>
                  <SectionTitle title={selectedMetricLabel} note={`${observationRows.length} MONTHLY OBSERVATIONS · PERCENT`} />
                  <div
                    className="chart-box"
                    role="img"
                    aria-label={`${selectedMetricLabel} by month. Exact values are available in the observations table.`}
                    data-testid="chart-dosm-labour-force"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={observationRows}>
                        <CartesianGrid stroke="#e4ebf4" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          minTickGap={26}
                          tickFormatter={fmtMonth}
                        />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={value => `${value}%`} />
                        <Tooltip
                          labelFormatter={value => fmtMonth(String(value))}
                          formatter={value => [`${value}%`, selectedMetricLabel]}
                        />
                        <Line
                          dataKey={metric}
                          name={selectedMetricLabel}
                          stroke="#3478d4"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="table-wrap">
                  <table data-testid="table-dosm-labour-force">
                    <caption className="sr-only">Recent DOSM monthly labour-force observations</caption>
                    <thead>
                      <tr>
                        <th>Observation month</th>
                        <th>Labour force (thousands)</th>
                        <th className="dosm-employed">Employed (thousands)</th>
                        <th className="dosm-unemployed">Unemployed (thousands)</th>
                        <th>Participation</th>
                        <th>Employment-to-population</th>
                        <th>Unemployment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {observationRows.slice(-12).reverse().map(row => (
                        <tr key={row.date}>
                          <td>{fmtMonth(row.date)}</td>
                          <td className="mono">{fmtCount(row.labourForceThousands)}</td>
                          <td className="mono dosm-employed">{fmtCount(row.employedThousands)}</td>
                          <td className="mono dosm-unemployed">{fmtCount(row.unemployedThousands)}</td>
                          <td className="mono">{fmtCount(row.participationRate)}%</td>
                          <td className="mono">{fmtCount(row.employmentPopulationRatio)}%</td>
                          <td className="mono">{fmtCount(row.unemploymentRate)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <details className="panel panel-pad" style={{ marginTop: 14, minWidth: 0 }} data-testid="panel-dosm-lfs-methodology">
              <summary>Source, methodology & cautions</summary>
              <dl className="evidence" style={{ marginTop: 12 }}>
                <dt>Source</dt>
                <dd>
                  <a className="text-link" href={labourForceQuery.data.metadata.sourceUrl} target="_blank" rel="noreferrer">
                    {labourForceQuery.data.metadata.sourceName} · {labourForceQuery.data.metadata.datasetId}
                  </a>
                </dd>
                <dt>API</dt>
                <dd><a className="text-link" href={labourForceQuery.data.metadata.apiUrl} target="_blank" rel="noreferrer">OpenDOSM endpoint</a></dd>
                <dt>License</dt>
                <dd>
                  {labourForceQuery.data.metadata.license} ·{" "}
                  <a className="text-link" href={labourForceQuery.data.metadata.licenseUrl} target="_blank" rel="noreferrer">license terms</a>
                </dd>
                <dt>Coverage</dt><dd>{labourForceQuery.data.metadata.coverage}</dd>
                <dt>Latest source observation</dt><dd>{fmtMonth(labourForceQuery.data.metadata.latestObservationDate)}</dd>
                <dt>Retrieved</dt><dd>{fmtTimestamp(labourForceQuery.data.metadata.retrievedAt)}</dd>
                <dt>Methodology</dt><dd>{labourForceQuery.data.metadata.methodology}</dd>
                <dt>Attribution</dt><dd>{labourForceQuery.data.metadata.attribution}</dd>
              </dl>
              <ul className="warn-list">
                {labourForceQuery.data.metadata.caveats.map(caveat => <li key={caveat}>{caveat}</li>)}
              </ul>
            </details>
          </>
        )}
      </section>

      <JobMarketInsightsPanel />
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="panel panel-pad" style={{ minWidth: 0 }}>
      <div className="small muted">{label}</div>
      <strong style={{ display: "block", fontSize: 22, margin: "8px 0 2px" }}>{value}</strong>
      <div className="small muted">{note}</div>
    </div>
  );
}

function JobMarketInsightsPanel() {
  const query = useGetDosmJobMarketInsights();
  return (
    <section className="panel panel-pad" style={{ minWidth: 0 }} data-testid="panel-dosm-job-market">
      <SectionTitle
        title="Online postings by major occupation group"
        note="DOSM JOB MARKET INSIGHTS · 2026 Q1 VS Q2"
        info="These are online job offerings reported by DOSM from major private recruitment platforms. They are not all vacancies or an estimate of skill demand."
      />
      <p className="muted" style={{ marginTop: 0 }}>
        Quarterly counts are shown as published. This reviewed workbook snapshot is not automatically refreshed.
      </p>

      {query.isPending && <LoadingBlock rows={2} />}
      {query.isError && (
        <ErrorBlock
          message="The reviewed DOSM job-posting snapshot could not be loaded."
          onRetry={() => { void query.refetch(); }}
        />
      )}
      {query.data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            {query.data.totalByQuarter.map(total => (
              <MetricCard
                key={total.quarter}
                label={`Total online offerings · ${total.quarter}`}
                value={fmtCount(total.jobOfferings)}
                note={`Published ${fmtDate(total.publicationDate)}`}
              />
            ))}
          </div>
          <div className="table-wrap">
            <table data-testid="table-dosm-job-market">
              <caption className="sr-only">DOSM online job offerings by major occupation group, Q1 and Q2 2026</caption>
              <thead>
                <tr>
                  <th>Major occupation group</th>
                  <th>2026 Q1 online offerings</th>
                  <th>2026 Q2 online offerings</th>
                </tr>
              </thead>
              <tbody>
                {query.data.occupationGroups.map(group => {
                  const q1 = group.observations.find(row => row.quarter === "2026-Q1");
                  const q2 = group.observations.find(row => row.quarter === "2026-Q2");
                  return (
                    <tr key={group.id} data-testid={`row-dosm-occupation-${group.id}`}>
                      <td>{group.label}</td>
                      <td className="mono">{q1 ? fmtCount(q1.jobOfferings) : "Not reported"}</td>
                      <td className="mono">{q2 ? fmtCount(q2.jobOfferings) : "Not reported"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <details className="panel panel-pad" style={{ marginTop: 14, minWidth: 0 }} data-testid="panel-dosm-jmi-methodology">
            <summary>Source, methodology & cautions</summary>
            <dl className="evidence" style={{ marginTop: 12 }}>
              <dt>Source</dt><dd>{query.data.sourceName}</dd>
              <dt>Measure</dt><dd>{query.data.measure}</dd>
              <dt>Coverage</dt><dd>{query.data.coverage}</dd>
              <dt>Classification</dt><dd>{query.data.classification}</dd>
              <dt>Methodology</dt><dd>{query.data.methodology}</dd>
              <dt>Snapshot reviewed</dt><dd>{fmtDate(query.data.reviewedAt)}</dd>
              <dt>Attribution</dt><dd>{query.data.attribution}</dd>
              <dt>Reuse terms</dt>
              <dd><a className="text-link" href={query.data.termsUrl} target="_blank" rel="noreferrer">Malaysian Government Open Data Terms of Use 1.0</a></dd>
              <dt>Report and workbook sources</dt>
              <dd>
                {query.data.totalByQuarter.map(item => (
                  <span key={item.quarter}>
                    <a className="text-link" href={item.reportUrl} target="_blank" rel="noreferrer">{item.quarter} report</a>
                    {" · "}
                    <a className="text-link" href={item.dataUrl} target="_blank" rel="noreferrer">data workbook</a>
                    {" · "}
                  </span>
                ))}
              </dd>
            </dl>
            <ul className="warn-list">
              {query.data.caveats.map(caveat => <li key={caveat}>{caveat}</li>)}
            </ul>
            {sourceLinks(query.data)}
          </details>
        </>
      )}
    </section>
  );
}
