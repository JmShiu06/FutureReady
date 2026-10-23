import { researchLabel } from '@workspace/workforce-evidence';
import { useAiResearch } from '@/hooks/use-ai-research';
export function AiResearchEvidence({ controls = false }: { controls?: boolean }) {
  const ai = useAiResearch();
  const snapshot = ai.data?.snapshot;
  return <div className="small" data-testid="ai-research-evidence">
    <p><b>{researchLabel}</b></p>
    {controls && <button className="btn btn-secondary btn-small" disabled={ai.busy} onClick={ai.refresh}> {ai.busy ? 'Fetching arXiv counts…' : 'Refresh AI signals'}</button>}
    <p role="status">{snapshot ? `arXiv API · Last updated ${snapshot.fetchedAt}` : 'arXiv API · Not fetched yet. No research counts available.'}</p>
    {(ai.data?.error || ai.isError || ai.refreshError) && <p role="alert">{ai.data?.error ?? 'AI source unavailable. No synthetic fallback is used.'}</p>}
    {snapshot && <details><summary>AI source evidence & calculation</summary>
      <p>Recent window: {snapshot.currentStart.slice(0, 10)} to {snapshot.end.slice(0, 10)} (exclusive). Previous: {snapshot.previousStart.slice(0, 10)} to {snapshot.currentStart.slice(0, 10)} (exclusive).</p>
      <div style={{ overflowWrap: 'anywhere' }}>{snapshot.counts.map(c => <details key={c.capability}><summary>{c.label}: {c.previous} → {c.current} papers</summary>
        <p>Growth: {c.growth === null ? 'Unknown: prior window is zero' : `${(100 * c.growth).toFixed(1)}%`}. Query: <code>{c.query}</code></p>
        <a href={c.previousQueryUrl} target="_blank" rel="noreferrer">Previous count query</a> · <a href={c.currentQueryUrl} target="_blank" rel="noreferrer">Recent count query</a>
      </details>)}</div>
      <p>Growth = (recent − prior) / prior. Weight = clamp(10 × growth, −10, 10) × reviewed skill direction; average overlapping capabilities. No percentage is computed when prior is zero. Moderate ×0.5; Fast ×1. Applied to learning priority only, bounded 0–100. Role overlap, baseline ranking and job-posting calculations are unchanged. Publication volume is not capability quality, adoption, job loss or a forecast; queries may miss papers or include irrelevant ones.</p>
    </details>}
  </div>;
}
