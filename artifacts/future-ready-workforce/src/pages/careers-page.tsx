import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, FlaskConical, Info, Workflow } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { demoService, methodology } from '@/domain/services';
import type { CareerAssessment } from '@/domain/types';
import { Bar, EmptyBlock, ErrorBlock, EvidencePanel, GapStatus, LoadingBlock, PageHead, PriorityTag, SectionTitle, useAsync } from '@/components/workspace/ui';

function Comparison({ list }: { list: CareerAssessment[] }) {
  const { setTargetRole } = useWorkspace();
  const [, navigate] = useLocation();
  const [a, setA] = useState(list[0]?.role.id ?? '');
  const [b, setB] = useState(list[1]?.role.id ?? list[0]?.role.id ?? '');
  useEffect(() => { if (!list.some(x => x.role.id === a)) setA(list[0]?.role.id ?? ''); if (!list.some(x => x.role.id === b)) setB(list[1]?.role.id ?? ''); }, [list, a, b]);
  const pick = [list.find(x => x.role.id === a), list.find(x => x.role.id === b)].filter(Boolean) as CareerAssessment[];
  const go = (id: string, to: string) => { setTargetRole(id); navigate(to); };
  return <div className="panel panel-pad" data-testid="panel-comparison">
    <SectionTitle title="Compare two careers" note="SIDE BY SIDE" />
    <div className="row" style={{ marginBottom: 14 }}>
      {[[a, setA, 'a'], [b, setB, 'b']].map(([v, set, k]) => <select key={k as string} className="select-field" value={v as string} onChange={e => (set as (s: string) => void)(e.target.value)} aria-label={`Comparison career ${k}`} data-testid={`select-compare-${k}`}>
        {list.map(x => <option key={x.role.id} value={x.role.id}>{x.role.title}</option>)}</select>)}
    </div>
    <div className="side-by-side">{pick.map((x, i) => <div key={`${x.role.id}-${i}`} className="role-card" data-testid={`card-compare-${i}`}>
      <strong>{x.role.title}</strong><span className="muted small">{x.role.category}</span>
      <div className="big-num">{x.readiness}%</div><Bar value={x.readiness} label={`${x.readiness}% coverage`} />
      <span className="small">Present: {x.present.length} · Missing: {x.missing.length} · Below target: {x.gaps.filter(g => g.currentLevel > 0).length}</span>
      <span className="small">Demand (separate): {x.role.demandLabel}</span>
      <div className="stack">{x.role.requiredSkills.map(r => { const g = [...x.present, ...x.missing].find(s => s.name === r.name)!; return <div key={r.name} className="spread small"><span>{r.name}</span><GapStatus gap={g} /></div>; })}</div>
      <div className="row"><button className="btn btn-primary btn-small" onClick={() => go(x.role.id, '/twin')} data-testid={`button-target-twin-${i}`}><FlaskConical size={12} /> Target & simulate</button>
        <button className="btn btn-secondary btn-small" onClick={() => go(x.role.id, '/roadmap')} data-testid={`button-target-roadmap-${i}`}><Workflow size={12} /> Target & roadmap</button></div>
    </div>)}</div>
  </div>;
}

export default function CareersPage() {
  const { profile, state, targetRoleId } = useWorkspace();
  const key = `${state.audience}:${JSON.stringify(profile.skills)}`;
  const result = useAsync(signal => demoService.matchCareers(profile, signal), key);
  const list = result.data ?? [];
  return <>
    <PageHead eyebrow="Career explorer · deterministic ranking" title="Where your skills could travel." subtitle="Ranked by illustrative proficiency coverage. Ties break by role ID, so the order is stable." />
    {result.status === 'loading' && !result.data && <LoadingBlock rows={4} />}
    {result.status === 'error' && <ErrorBlock message={result.error ?? 'Could not rank careers.'} onRetry={result.retry} />}
    {result.status !== 'error' && result.data && (list.length === 0 ? <EmptyBlock title="No sample careers available.">Add skills in your profile and try again.</EmptyBlock> : <>
      <div className="grid-2">{list.map((x, i) => <article key={x.role.id} className={`role-card${x.role.id === targetRoleId ? ' selected' : ''}`} data-testid={`card-career-${x.role.id}`}>
        <div className="spread"><span className="row"><span className="rank">#{i + 1}</span><strong>{x.role.title}</strong></span>{x.role.id === targetRoleId && <span className="match-pill">Current target</span>}</div>
        <span className="muted small">{x.role.category} · {x.role.industry}</span>
        <p className="muted" style={{ margin: 0 }}>{x.role.description}</p>
        <div className="spread small"><span>Illustrative proficiency coverage</span><b className="mono" data-testid={`text-score-${x.role.id}`}>{x.readiness}%</b></div>
        <Bar value={x.readiness} label={`${x.readiness}% coverage`} />
        <div className="small">Demand label (not readiness): <b>{x.role.demandLabel}</b></div>
        <div className="stack">{x.gaps.slice(0, 3).map(g => <div key={g.name} className="spread small"><span className="row">{g.name}<PriorityTag priority={g.priority} /></span><GapStatus gap={g} /></div>)}
          {x.gaps.length === 0 && <span className="small">All sample requirements met.</span>}</div>
        <Link href={`/roles/${x.role.id}`} className="text-link" data-testid={`link-role-${x.role.id}`}>Role detail & evidence <ArrowRight size={12} /></Link>
      </article>)}</div>
      <Comparison list={list} />
      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="panel panel-pad"><SectionTitle title="Methodology" note="HOW THE SCORE WORKS" /><p className="muted" data-testid="text-methodology">{methodology}</p>
          <div className="disclaimer"><Info size={14} /><span>Uncertainty: requirements and levels are hand-authored; small edits to self-ratings can change the order.</span></div></div>
        <div className="panel panel-pad"><SectionTitle title="Evidence" note="SHARED BY ALL SAMPLE ROLES" /><EvidencePanel evidence={list[0].role.evidence} /></div>
      </div>
    </>)}
  </>;
}
