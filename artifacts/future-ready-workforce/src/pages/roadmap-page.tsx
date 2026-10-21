import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Info } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { demoRoles } from '@/domain/demo-data';
import { buildRoadmap, completionKey } from '@/domain/services';
import { ChiliProgressBar } from '@/components/chili-progress-bar';
import { EmptyBlock, PageHead, PriorityTag, SectionTitle } from '@/components/workspace/ui';

export default function RoadmapPage() {
  const { state, profile, targetRoleId, setTargetRole, saveProfile, toggleCompletion } = useWorkspace();
  const [costFilter, setCostFilter] = useState<'all' | 'free' | 'low'>('all');
  const [hours, setHours] = useState(profile.learningHours === null ? '' : String(profile.learningHours));
  const [budget, setBudget] = useState(profile.budgetMYR === null ? '' : String(profile.budgetMYR));
  const [target, setTarget] = useState(targetRoleId);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setHours(profile.learningHours === null ? '' : String(profile.learningHours));
    setBudget(profile.budgetMYR === null ? '' : String(profile.budgetMYR));
    setTarget(targetRoleId);
  }, [profile, targetRoleId]);
  const role = demoRoles.find(r => r.id === targetRoleId) ?? demoRoles[0];
  const milestones = useMemo(() => buildRoadmap(profile, role.id), [profile, role.id]);
  const shown = milestones.filter(m => costFilter === 'all' || (costFilter === 'free' ? m.costMYR === 0 : m.costMYR <= 100));
  const done = milestones.filter(m => state.completion[completionKey(state.audience, m.id)]).length;
  const totalCost = milestones.reduce((t, m) => t + m.costMYR, 0);
  let week = 1;
  const schedule = profile.learningHours === null ? [] : milestones.map(m => {
    const weeks = Math.max(1, Math.ceil(m.durationHours / profile.learningHours!));
    const s = { m, start: week, end: week + weeks - 1 };
    week += weeks;
    return s;
  });
  const budgetSummary = profile.budgetMYR === null
    ? 'budget not set — add one in Replan to compare.'
    : `budget MYR ${profile.budgetMYR}${totalCost > profile.budgetMYR ? ' — over budget; try the free filter.' : ' — within budget.'}`;

  const apply = () => {
    const h = Number(hours), b = Number(budget);
    if (!Number.isInteger(h) || h < 1 || h > 40) return setMsg('Hours must be a whole number from 1 to 40.');
    if (!budget.trim() || !Number.isFinite(b) || b < 0 || b > 100000) return setMsg('Budget must be between MYR 0 and 100,000.');
    saveProfile({ ...profile, learningHours: h, budgetMYR: b });
    if (target !== targetRoleId) setTargetRole(target);
    setMsg('Plan updated.');
  };

  return <>
    <PageHead eyebrow={`Learning roadmap · ${role.title}`} title="One practical step at a time." subtitle="Completing a milestone tracks progress only. It never changes your profile skill levels." />
    <div className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Progress" note={`${done} OF ${milestones.length} MILESTONES`} />
        <ChiliProgressBar value={milestones.length ? 100 * done / milestones.length : 0} label="Roadmap completion" valueText={`${done} of ${milestones.length} milestones complete`} testId="progress-roadmap" />
        <p className="muted" style={{ marginTop: 10 }} data-testid="text-plan-cost">Total sample cost MYR {totalCost} · {budgetSummary}</p>
        <p className="muted small">Priority skills: {milestones.map(m => m.skill).join(', ') || 'none'}</p>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Replan" note="UPDATES PROFILE AND PLAN" />
        <div className="stack">
          <div className="field"><label htmlFor="rp-target">Target role</label><select id="rp-target" className="fr-select" value={target} onChange={e => setTarget(e.target.value)} data-testid="select-replan-target">{demoRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
          <div className="row"><div className="field" style={{ flex: 1 }}><label htmlFor="rp-h">Hours / week</label><input id="rp-h" type="number" min={1} max={40} className="fr-input" value={hours} onChange={e => setHours(e.target.value)} data-testid="input-replan-hours" /></div>
            <div className="field" style={{ flex: 1 }}><label htmlFor="rp-b">Budget MYR</label><input id="rp-b" type="number" min={0} className="fr-input" value={budget} onChange={e => setBudget(e.target.value)} data-testid="input-replan-budget" /></div></div>
          <button className="btn btn-primary" onClick={apply} data-testid="button-apply-replan">Apply</button>
          {msg && <span className="small" role="status" data-testid="status-replan">{msg}</span>}
        </div>
      </div>
    </div>
    <div className="row" style={{ marginBottom: 12 }}>
      {(['all', 'free', 'low'] as const).map(f => <button key={f} className={`btn btn-small ${costFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCostFilter(f)} aria-pressed={costFilter === f} data-testid={`button-cost-${f}`}>{f === 'all' ? 'All' : f === 'free' ? 'Free' : 'Low cost (MYR 100 or less)'}</button>)}
    </div>
    {milestones.length === 0 ? <EmptyBlock title="No gaps for this target.">You meet every sample requirement. <Link href="/careers" className="text-link">Choose another career</Link></EmptyBlock>
      : shown.length === 0 ? <EmptyBlock title="No milestones match this cost filter." />
      : <div className="dashboard-grid">
        <div className="stack">{shown.map(m => { const key = completionKey(state.audience, m.id); const isDone = !!state.completion[key]; return <div key={m.id} className={`milestone${isDone ? ' done' : ''}`} data-testid={`card-milestone-${m.order}`}>
          <input type="checkbox" checked={isDone} onChange={() => toggleCompletion(key)} aria-label={`Mark ${m.title} complete`} data-testid={`checkbox-milestone-${m.order}`} />
          <div className="stack" style={{ gap: 6 }}>
            <div className="spread"><h3>{m.order}. {m.title}</h3><PriorityTag priority={m.priority} /></div>
            <span className="small">{m.provider} · {m.durationHours} hrs · {m.costMYR === 0 ? 'Free' : `MYR ${m.costMYR}`}{m.synthetic ? ' · synthetic' : ''}</span>
            <span className="small">{m.verifiedUrl ? <a href={m.verifiedUrl} target="_blank" rel="noreferrer" className="text-link">{m.verifiedUrl}</a> : 'No verified URL — fictional example'}</span>
            <span className="small muted">Prerequisites: {m.prerequisites.join('; ')}</span>
          </div></div>; })}</div>
        <div className="panel panel-pad"><SectionTitle title="Weekly schedule" note={profile.learningHours === null ? 'SET HOURS IN REPLAN' : `AT ${profile.learningHours} HRS / WEEK`} />
          {profile.learningHours === null
            ? <p className="muted">Set weekly learning hours in Replan to calculate a schedule.</p>
            : schedule.map(s => <div key={s.m.id} className="week-row"><span className="mono">Wk {s.start}{s.end > s.start ? `–${s.end}` : ''}</span><span>{s.m.skill}</span></div>)}
          <div className="disclaimer"><Info size={14} /><span>Weeks = duration hours ÷ weekly learning hours, rounded up, in milestone order.</span></div></div>
      </div>}
  </>;
}
