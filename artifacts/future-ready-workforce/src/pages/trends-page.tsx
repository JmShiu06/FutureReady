import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { demoRoles, marketRecords } from '@/domain/demo-data';
import { demoService } from '@/domain/services';
import type { RadarFilters } from '@/domain/types';
import { EmptyBlock, ErrorBlock, EvidencePanel, LoadingBlock, PageHead, SectionTitle, useAsync } from '@/components/workspace/ui';
import { DosmDataPanels } from '@/components/workspace/dosm-data-panels';
import { AiAnnouncementsPanel, SkillFrequencyPanel } from '@/components/workspace/radar-evidence-panels';

const uniq = (xs: string[]) => Array.from(new Set(xs)).sort();
const colors = ['#3478d4', '#159a9a', '#7b61c9', '#5f8d45', '#d27b28', '#a9578f', '#5b7187', '#32908a', '#7f6c42', '#6c72b5'];

export default function TrendsPage() {
  const [filters, setFilters] = useState<RadarFilters>({});
  const [selected, setSelected] = useState<string | null>(null);
  const result = useAsync(signal => demoService.getSkillMarket(filters, signal), JSON.stringify(filters));
  const records = result.data ?? [];
  const set = (k: keyof RadarFilters, v: string) => { setSelected(null); setFilters(f => ({ ...f, [k]: v || undefined })); };
  const chartData = useMemo(() => {
    const dates = uniq(records.flatMap(r => r.observations.map(o => o.date)));
    return dates.map(date => Object.fromEntries([['date', date], ...records.map(r => [r.id, r.observations.find(o => o.date === date)?.value ?? null])]));
  }, [records]);
  const detail = records.find(r => r.id === selected);
  const sel = (label: string, k: keyof RadarFilters, opts: [string, string][]) => <div className="field"><label htmlFor={`f-${k}`}>{label}</label>
    <select id={`f-${k}`} className="fr-select" value={filters[k] ?? ''} onChange={e => set(k, e.target.value)} data-testid={`select-filter-${k}`}><option value="">All</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
  return <>
    <PageHead eyebrow="Skills radar · evidence panels" title="Signals to discuss, not to bet on." subtitle="Four separate evidence types: national labour-force indicators, online job offerings by occupation, AI-related government announcements, and global skill-posting frequencies. None is a forecast, and none is combined into a score." />
    <DosmDataPanels />
    <div className="stack" style={{ gap: 18, marginBottom: 22, minWidth: 0 }}>
      <AiAnnouncementsPanel />
      <SkillFrequencyPanel />
    </div>
    <details className="panel panel-pad" style={{ marginBottom: 18 }} data-testid="panel-synthetic-examples">
      <summary><strong>Synthetic examples (fictional, not evidence)</strong></summary>
      <p className="muted" style={{ marginTop: 12 }}>These hand-authored records exist only to demonstrate the filters. Do not read them as real labour-market data.</p>
    </details>
    <details className="stack" style={{ marginBottom: 18 }} data-testid="section-synthetic-radar">
      <summary>Open synthetic skill-history demo</summary>
    <div className="panel panel-pad" style={{ marginBottom: 18 }}>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        {sel('Category', 'category', uniq(marketRecords.map(r => r.category)).map(v => [v, v]))}
        {sel('Occupation', 'roleId', demoRoles.map(r => [r.id, r.title]))}
        {sel('Industry', 'industry', uniq(marketRecords.map(r => r.industry)).map(v => [v, v]))}
        {sel('Region', 'region', uniq(marketRecords.map(r => r.region)).map(v => [v, v]))}
        <div className="field"><label htmlFor="f-from">From</label><input id="f-from" type="date" className="fr-input" value={filters.from ?? ''} onChange={e => set('from', e.target.value)} data-testid="input-filter-from" /></div>
        <div className="field"><label htmlFor="f-to">To</label><input id="f-to" type="date" className="fr-input" value={filters.to ?? ''} onChange={e => set('to', e.target.value)} data-testid="input-filter-to" /></div>
      </div>
      <button className="text-link" onClick={() => { setFilters({}); setSelected(null); }} data-testid="button-clear-filters">Clear filters</button>
    </div>
    <details className="panel panel-pad" style={{ marginBottom: 18 }} data-testid="panel-radar-methodology">
      <summary>Evidence & methodology</summary>
      <p className="muted" style={{ marginTop: 12 }}>Each series contains hand-authored fictional posting counts at four historical sample dates. The chart plots those exact values, not a projection or an estimate of labour-market demand. Filters select records and observations; they do not infer missing dates or average regions together.</p>
      <p className="muted">Select a record below for its source fields, observation period, last-updated date and missing/stale evidence warnings. No verified labour-market source is connected.</p>
    </details>
    {result.status === 'loading' && !result.data && <LoadingBlock />}
    {result.status === 'error' && <ErrorBlock message={result.error ?? 'Could not load signals.'} onRetry={result.retry} />}
    {result.status !== 'error' && result.data && (records.length === 0 ? <EmptyBlock title="No records match these filters.">Widen the date range or clear a filter.</EmptyBlock> : <>
      <div className="panel chart-card" style={{ marginBottom: 18 }}>
        <SectionTitle title="Synthetic history" note="SYNTHETIC POSTING COUNT BY DATE" />
        <div className="chart-box" role="img" aria-label="Line chart of synthetic posting counts; see the data table below for values">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}>
            <CartesianGrid stroke="#e4ebf4" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
            {records.map((r, i) => <Line key={r.id} dataKey={r.id} name={`${r.skill} (${r.region})`} stroke={colors[i % colors.length]} strokeWidth={2} dot isAnimationActive={false} connectNulls />)}
          </LineChart></ResponsiveContainer>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="panel panel-pad"><SectionTitle title="Data table" note={`${records.length} RECORDS`} />
          <div className="table-wrap"><table><caption className="sr-only">Synthetic skill market records</caption>
            <thead><tr><th>Skill</th><th>Category</th><th>Industry</th><th>Region</th><th>Observations</th><th>Latest</th></tr></thead>
            <tbody>{records.map(r => <tr key={r.id} data-testid={`row-record-${r.id}`}><td><button className="record-btn" onClick={() => setSelected(r.id)} data-testid={`button-record-${r.id}`}>{r.skill}</button></td><td>{r.category}</td><td>{r.industry}</td><td>{r.region}</td>
              <td className="mono">{r.observations.map(o => `${o.date}: ${o.value}`).join(' · ')}</td><td className="mono">{r.observations[r.observations.length - 1].value}</td></tr>)}</tbody></table></div>
        </div>
        <div className="panel panel-pad"><SectionTitle title="Record detail" note="SOURCE AND FRESHNESS" />
          {detail ? <div className="stack" data-testid="panel-record-detail"><strong>{detail.skill} · {detail.region}</strong><span className="small">{detail.demandLabel} · roles: {detail.roleIds.map(id => demoRoles.find(r => r.id === id)?.title).join(', ') || 'none'}</span><EvidencePanel evidence={detail.evidence} testId="panel-record-evidence" /></div>
            : <p className="muted">Choose a skill in the table to see its source name, source URL, observation period and warnings.</p>}
        </div>
      </div>
    </>)}
    </details>
  </>;
}
