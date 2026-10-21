import { useState } from 'react';
import { Link } from 'wouter';
import { Info } from 'lucide-react';
import { demoRoles, sdgGoals, sdgMappings } from '@/domain/demo-data';
import { EmptyBlock, PageHead, SectionTitle } from '@/components/workspace/ui';

export default function SdgsPage() {
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [view, setView] = useState<'role' | 'skill'>('role');
  const [goal, setGoal] = useState(4);
  const mapped = new Set(sdgMappings.map(m => m.goal));
  const current = sdgGoals.find(g => g.number === goal)!;
  const maps = sdgMappings.filter(m => m.goal === goal);
  const visibleGoals = sdgGoals.filter(g => filter === 'all' || (filter === 'mapped' ? mapped.has(g.number) : !mapped.has(g.number)));
  const changeFilter = (next: typeof filter) => {
    setFilter(next);
    const matching = sdgGoals.filter(g => next === 'all' || (next === 'mapped' ? mapped.has(g.number) : !mapped.has(g.number)));
    if (!matching.some(g => g.number === goal)) setGoal(matching[0].number);
  };
  return <>
    <PageHead eyebrow="SDG explorer · 17 goals" title="Possible links to wider impact." subtitle="Goal names follow the UN list. Every mapping here is an unverified sample, not evidence of impact." />
    <div className="panel panel-pad" style={{ marginBottom: 18 }}>
      <div className="spread" style={{ marginBottom: 12 }}>
        <div className="scenario-tabs" role="group" aria-label="Filter goals">{(['all', 'mapped', 'unmapped'] as const).map(f => <button key={f} className={`scenario-tab${filter === f ? ' active' : ''}`} aria-pressed={filter === f} onClick={() => changeFilter(f)} data-testid={`button-sdg-filter-${f}`}>{f === 'all' ? 'All 17' : f === 'mapped' ? 'With sample mapping' : 'No mapping'}</button>)}</div>
        <a href="https://sdgs.un.org/goals" target="_blank" rel="noreferrer" className="text-link" data-testid="link-un-sdgs">UN goal definitions (sdgs.un.org/goals)</a>
      </div>
      <div className="sdg-grid">{visibleGoals.map(g => { const has = mapped.has(g.number);
        return <button key={g.number} className={`sdg-tile${has ? ' mapped' : ''}${goal === g.number ? ' active' : ''}`} onClick={() => setGoal(g.number)} aria-pressed={goal === g.number} data-testid={`button-sdg-${g.number}`}><b>{g.number}</b><span>{g.name}</span><span className="small mono">{has ? 'sample mapping' : 'unmapped'}</span></button>; })}</div>
    </div>
    <div className="panel panel-pad">
      <SectionTitle title={`SDG ${current.number}: ${current.name}`} note="SELECTED GOAL" action={<div className="scenario-tabs" role="group" aria-label="Impact view">{(['role', 'skill'] as const).map(v => <button key={v} className={`scenario-tab${view === v ? ' active' : ''}`} aria-pressed={view === v} onClick={() => setView(v)} data-testid={`button-sdg-view-${v}`}>{v === 'role' ? 'Role impact' : 'Skill impact'}</button>)}</div>} />
      {maps.length === 0 ? <EmptyBlock title="No sample role or skill is mapped to this goal.">We do not map every goal. An empty result is an honest result.</EmptyBlock>
        : <div className="stack">{maps.map(m => { const role = demoRoles.find(r => r.id === m.roleId); return <div key={m.roleId} className="role-card" data-testid={`card-sdg-mapping-${m.roleId}`}>
          {view === 'role' ? <Link href={`/roles/${m.roleId}`} className="text-link">{role?.title}</Link> : <div className="row">{m.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>}
          <p className="muted" style={{ margin: 0 }}>{m.explanation}</p>
          <span className="small"><b>Verification:</b> {m.verified ? 'Verified' : 'Unverified sample'} · <b>Citation:</b> {m.citationName ?? 'None'} {m.citationUrl ? <a className="text-link" href={m.citationUrl} target="_blank" rel="noreferrer">{m.citationUrl}</a> : '(no citation URL)'}</span>
        </div>; })}</div>}
      <div className="disclaimer"><Info size={14} /><span>The UN overview defines the goals only. It is not proof that any role or skill contributes to a goal.</span></div>
    </div>
  </>;
}
