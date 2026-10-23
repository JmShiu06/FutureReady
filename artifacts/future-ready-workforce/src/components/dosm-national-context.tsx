import { useGetDosmOccupationEmploymentSearch } from "@workspace/api-client-react";

export function formatPeople(thousands: number) {
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

export function DosmNationalContext() {
  const query = useGetDosmOccupationEmploymentSearch({ q: undefined });
  const context = query.data?.nationalContext;
  const latest = context?.latestObservation;

  return (
    <section className="dosm-occupation-national panel" aria-labelledby="dosm-national-title" data-testid="panel-dosm-national-context" style={{ marginBottom: 18 }}>
      <div className="dosm-occupation-national-heading">
        <div>
          <h3 id="dosm-national-title">Malaysia-wide context</h3>
          <p>{latest ? `All occupations · latest DOSM observation: ${formatMonth(latest.date)}` : "All occupations · DOSM monthly Labour Force Survey"}</p>
        </div>
        {context && <a className="text-link" href={context.metadata.sourceUrl} target="_blank" rel="noreferrer" data-testid="link-dosm-national-source">OpenDOSM source</a>}
      </div>
      {query.isPending && <p className="small muted" role="status">Loading verified DOSM labour-market data…</p>}
      {query.isError && (
        <div className="dosm-occupation-error" role="alert">
          <span>Official DOSM labour-market data could not be loaded.</span>
          <button className="text-link" onClick={() => { void query.refetch(); }} data-testid="button-retry-dosm-national">Retry</button>
        </div>
      )}
      {context?.isStale && context.warning && <p className="dosm-occupation-warning" role="status">{context.warning}</p>}
      {query.data && !latest && <p className="small muted" data-testid="status-dosm-national-empty">No national DOSM observation is currently available.</p>}
      {latest && (
        <>
          <div className="dosm-occupation-stats">
            <StatCard label="People employed" value={formatPeople(latest.employedThousands)} note="All Malaysian occupations" />
            <StatCard label="People unemployed" value={formatPeople(latest.unemployedThousands)} note="All Malaysian occupations" />
            <StatCard label="Unemployment rate" value={`${latest.unemploymentRate.toFixed(1)}%`} note="National labour force" />
            <StatCard label="Employment-to-population ratio" value={`${latest.employmentPopulationRatio.toFixed(1)}%`} note="National working-age population" />
          </div>
          <p className="dosm-occupation-rate-explainer">
            The national unemployment rate is unemployed people divided by the labour force. The employment-to-population ratio is the share of the working-age population that is employed. Neither is a rate for any individual job.
          </p>
        </>
      )}
    </section>
  );
}
