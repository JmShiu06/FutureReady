import { useMemo, useState } from 'react';
import { Link, Redirect } from 'wouter';
import { ShieldCheck } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { aggregateRecords, demoRoles } from '@/domain/demo-data';
import { assessRole, meanSkillGap } from '@/domain/services';
import type { AggregateRecord } from '@/domain/types';
import { EmptyBlock, PageHead, SectionTitle } from '@/components/workspace/ui';

const buckets = [['0–49%', 0, 49], ['50–74%', 50, 74], ['75–99%', 75, 99], ['100%', 100, 100]] as const;
const heat = (v: number) => v === 0 ? '#f6efe7' : v < 2 ? '#f8dcc4' : v < 3 ? '#f0b98d' : v < 4 ? '#de8a50' : '#b84d11';
const assess = (r: AggregateRecord) => assessRole(r, demoRoles.find(d => d.id === r.targetRoleId) ?? demoRoles[0]);

function Distribution({ records }: { records: AggregateRecord[] }) {
  const scores = records.map(r => assess(r).readiness);
  return <div data-testid="chart-distribution">{buckets.map(([label, lo, hi]) => { const n = scores.filter(s => s >= lo && s <= hi).length; return <div key={label} className="dist-row"><span>{label}</span><div className="bar-track"><i style={{ width: `${records.length ? 100 * n / records.length : 0}%` }} /></div><b className="mono">{n}</b></div>; })}
    <p className="muted small">Illustrative coverage toward each record's target role (assessRole). Counts only, no individuals.</p></div>;
}

function commonGaps(records: AggregateRecord[]) {
  const c = new Map<string, number>();
  records.forEach(r => assess(r).gaps.forEach(g => c.set(g.name, (c.get(g.name) ?? 0) + 1)));
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function HrView() {
  const [dept, setDept] = useState('');
  const groups = Array.from(new Set(aggregateRecords.map(r => r.group)));
  const records = aggregateRecords.filter(r => !dept || r.group === dept);
  const skills = Array.from(new Set(demoRoles.flatMap(r => r.requiredSkills.map(s => s.name)))).sort();
  const gaps = commonGaps(records);
  const shown = dept ? [dept] : groups;
  const avg = (g: string, s: string) => meanSkillGap(records.filter(r => r.group === g), s);
  return <>
    <PageHead eyebrow="HR & L&D · aggregate team view" title="Where should learning investment go?" subtitle="Aggregated synthetic records. No hiring decisions, no ranking of individual employees." />
    <div className="panel panel-pad" style={{ marginBottom: 18 }}><div className="field" style={{ maxWidth: 300 }}><label htmlFor="dept">Department</label><select id="dept" className="fr-select" value={dept} onChange={e => setDept(e.target.value)} data-testid="select-department"><option value="">All departments</option>{groups.map(g => <option key={g}>{g}</option>)}</select></div></div>
    {records.length === 0 ? <EmptyBlock title="No records for this department." /> : <>
      <div className="panel panel-pad" style={{ marginBottom: 18 }}>
        <SectionTitle title="Workforce skill-gap heatmap" note="AVERAGE TARGET-LEVEL SHORTFALL · GROUP × SKILL" />
        <div className="table-wrap"><table className="heat"><thead><tr><th>Group</th>{skills.map(s => <th key={s}>{s}</th>)}</tr></thead>
          <tbody>{shown.map(g => <tr key={g}><td>{g} <span className="small">(n={records.filter(r => r.group === g).length})</span></td>{skills.map(s => { const cell = avg(g, s); const v = cell.meanGap; return <td key={s} className="cell" style={{ background: v === null ? '#f2efea' : heat(v), color: v !== null && v >= 4 ? '#fffaf4' : '#4a2a17' }} title={`${cell.recordCount} records with this skill required by their target role`} data-testid={`cell-${g}-${s}`}>{v === null ? 'N/A' : v.toFixed(1)}<small style={{ display: 'block', marginTop: 3 }}>n={cell.recordCount}</small></td>; })}</tr>)}</tbody></table></div>
        <div className="legend-scale" aria-label="Legend">Gap legend: {[0, 1.5, 2.5, 3.5, 4.5].map((v, i) => <span key={v} className="row" style={{ gap: 3 }}><i style={{ background: heat(v) }} />{['0 (met)', '<2', '2–3', '3–4', '4+'][i]}</span>)}</div>
        <p className="muted small">A gap is required level minus current level, floored at zero. Missing skills contribute the full required level. Each cell averages only records whose target role requires that skill; N/A means no applicable records.</p>
      </div>
      <div className="dashboard-grid">
        <div className="panel panel-pad"><SectionTitle title="Readiness distribution" note={`${records.length} RECORDS`} /><Distribution records={records} /></div>
        <div className="panel panel-pad"><SectionTitle title="Priorities & shortages" note="RECORDS BELOW TARGET" />
          <div className="gap-list">{gaps.slice(0, 5).map(([s, n]) => <div key={s} className="gap-row"><span><strong>{s}</strong><small>{n} of {records.length} records below target</small></span><span className="gap-tag">{Math.round(100 * n / records.length)}%</span></div>)}</div>
          <Link href="/market-and-ai-impact?tab=ai-impact" className="btn btn-secondary" style={{ marginTop: 14, width: '100%' }} data-testid="link-team-scenarios">Review AI task exposure</Link></div>
      </div>
    </>}
  </>;
}

function EducationView() {
  const [prog, setProg] = useState('');
  const programmes = Array.from(new Set(aggregateRecords.map(r => r.programme)));
  const records = aggregateRecords.filter(r => !prog || r.programme === prog);
  const gaps = commonGaps(records);
  const matrix = useMemo(() => (prog ? [prog] : programmes).map(p => ({ p, cells: demoRoles.map(role => { const rs = aggregateRecords.filter(r => r.programme === p); return rs.length ? Math.round(rs.reduce((t, r) => t + assessRole(r, role).readiness, 0) / rs.length) : 0; }) })), [prog, programmes]);
  return <>
    <PageHead eyebrow="University & TVET · cohort view" title="Explore curriculum through sample gaps." subtitle="Synthetic cohort aggregates. Not an assessment of any individual graduate." />
    <div className="panel panel-pad" style={{ marginBottom: 18 }}><div className="field" style={{ maxWidth: 300 }}><label htmlFor="prog">Programme / cohort</label><select id="prog" className="fr-select" value={prog} onChange={e => setProg(e.target.value)} data-testid="select-programme"><option value="">All programmes</option>{programmes.map(g => <option key={g}>{g}</option>)}</select></div></div>
    {records.length === 0 ? <EmptyBlock title="No records for this programme." /> : <>
      <div className="dashboard-grid">
        <div className="panel panel-pad"><SectionTitle title="Graduate readiness distribution" note={`${records.length} RECORDS`} /><Distribution records={records} /></div>
        <div className="panel panel-pad"><SectionTitle title="Common missing skills" note="BELOW TARGET" /><div className="gap-list">{gaps.slice(0, 5).map(([s, n]) => <div key={s} className="gap-row"><span><strong>{s}</strong></span><span className="gap-tag">{n} records</span></div>)}</div></div>
      </div>
      <div className="panel panel-pad" style={{ marginBottom: 18 }}><SectionTitle title="Programme vs pathway" note="AVERAGE ILLUSTRATIVE COVERAGE %" />
        <div className="table-wrap"><table><thead><tr><th>Programme</th>{demoRoles.map(r => <th key={r.id}>{r.title}</th>)}</tr></thead><tbody>{matrix.map(row => <tr key={row.p}><td>{row.p}</td>{row.cells.map((c, i) => <td key={i} className="mono">{c}%</td>)}</tr>)}</tbody></table></div></div>
      <div className="dashboard-grid">
        <div className="panel panel-pad"><SectionTitle title="Curriculum suggestions" note="DERIVED FROM TOP GAPS" /><ul className="muted">{gaps.slice(0, 3).map(([s]) => <li key={s}>Embed a graded practical project in {s.toLowerCase()} within an existing module.</li>)}</ul></div>
        <div className="panel panel-pad"><SectionTitle title="Workshop priorities" note="SHORT-FORM TRAINING" /><ol className="muted">{gaps.slice(0, 4).map(([s, n]) => <li key={s}>{s} workshop — {n} of {records.length} records would benefit</li>)}</ol></div>
      </div>
    </>}
  </>;
}

export default function TeamPage() {
  const { state } = useWorkspace();
  if (state.audience !== 'hr' && state.audience !== 'education') return <Redirect to="/" />;
  return <>
    {state.audience === 'education' ? <EducationView /> : <HrView />}
    <div className="disclaimer"><ShieldCheck size={14} /><span>Use real data only with consent, governance and safeguards.</span></div>
  </>;
}
