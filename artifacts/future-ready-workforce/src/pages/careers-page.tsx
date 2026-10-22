import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { BuildRoadmapButton } from '@/components/build-roadmap-button';
import { planKey } from '@/domain/learning';
import { useWorkspace } from '@/domain/workspace-context';
import { demoService } from '@/domain/services';
import type { CareerAssessment } from '@/domain/types';
import { Bar, EmptyBlock, ErrorBlock, GapStatus, LoadingBlock, PageHead, PriorityTag, SectionTitle, useAsync } from '@/components/workspace/ui';
import { OfficialOccupationsPanel } from '@/components/workspace/occupation-evidence';

const hiddenRecommendationRoleIds = new Set([
  'ai-operations',
  'service-designer',
  'learning-partner',
  'workforce-analyst',
]);

function Comparison({ list }: { list: CareerAssessment[] }) {
  const [a, setA] = useState(list[0]?.role.id ?? '');
  const [b, setB] = useState(list[1]?.role.id ?? list[0]?.role.id ?? '');
  useEffect(() => { if (!list.some(x => x.role.id === a)) setA(list[0]?.role.id ?? ''); if (!list.some(x => x.role.id === b)) setB(list[1]?.role.id ?? ''); }, [list, a, b]);
  const pick = [list.find(x => x.role.id === a), list.find(x => x.role.id === b)].filter(Boolean) as CareerAssessment[];
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
      <div className="row"><BuildRoadmapButton roleId={x.role.id} testId={`button-build-roadmap-compare-${i}`} /></div>
    </div>)}</div>
  </div>;
}

export default function CareersPage() {
  const { profile, state, targetRoleId } = useWorkspace();
  const roadmapTarget = (id: string) => id === targetRoleId && !!state.baselines[planKey(state.audience, id)];
  const key = `${state.audience}:${JSON.stringify(profile.skills)}`;
  const result = useAsync(signal => demoService.matchCareers(profile, signal), key);
  const list = result.data ?? [];
  const recommendationCards = list.filter(x => !hiddenRecommendationRoleIds.has(x.role.id));
  return <>
    <PageHead eyebrow="Career explorer · occupation evidence" title="Where your skills could travel." subtitle="Explore official Malaysian critical-occupation evidence, then compare two career paths side by side. The comparison uses illustrative skill coverage, not a hiring prediction." />
    {result.status === 'loading' && !result.data && <LoadingBlock rows={4} />}
    {result.status === 'error' && <ErrorBlock message={result.error ?? 'Could not rank careers.'} onRetry={result.retry} />}
    {result.status !== 'error' && result.data && <>
      {recommendationCards.length > 0 && <div className="grid-2">{recommendationCards.map((x, i) => <article key={x.role.id} className={`role-card${roadmapTarget(x.role.id) ? ' selected' : ''}`} data-testid={`card-career-${x.role.id}`}>
        <div className="spread"><span className="row"><span className="rank">#{i + 1}</span><strong>{x.role.title}</strong></span>{roadmapTarget(x.role.id) && <span className="match-pill">Roadmap target</span>}</div>
        <span className="muted small">{x.role.category} · {x.role.industry}</span>
        <p className="muted" style={{ margin: 0 }}>{x.role.description}</p>
        <div className="spread small"><span>Illustrative proficiency coverage</span><b className="mono" data-testid={`text-score-${x.role.id}`}>{x.readiness}%</b></div>
        <Bar value={x.readiness} label={`${x.readiness}% coverage`} />
        <div className="small">Demand label (not readiness): <b>{x.role.demandLabel}</b></div>
        <div className="small" data-testid={`text-skill-counts-${x.role.id}`}>{x.role.requiredSkills.length} required · <b>{x.present.length}</b> you have (any level) · <b>{x.gaps.length}</b> remaining gap{x.gaps.length === 1 ? '' : 's'}</div>
        <div className="stack">{[...x.present, ...x.missing].map(g => <div key={g.name} className="spread small"><span className="row">{g.name}<PriorityTag priority={g.priority} /></span><GapStatus gap={g} /></div>)}</div>
        <BuildRoadmapButton roleId={x.role.id} testId={`button-build-roadmap-${x.role.id}`} />
        <Link href={`/roles/${x.role.id}`} className="text-link" data-testid={`link-role-${x.role.id}`}>Role detail & evidence <ArrowRight size={12} /></Link>
      </article>)}</div>}
      <OfficialOccupationsPanel />
      <Comparison list={list} />
    </>}
  </>;
}
