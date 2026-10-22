import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Info } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { demoRoles } from '@/domain/demo-data';
import { completionKey } from '@/domain/services';
import { activeBaseline, roadmapMilestones } from '@/domain/learning';
import { ChiliProgressBar } from '@/components/chili-progress-bar';
import { EmptyBlock, PriorityTag, SectionTitle } from '@/components/workspace/ui';

export function RoadmapSection({ onReview }: { onReview: () => void }) {
  const { state, profile, targetRoleId, saveProfile, setMilestoneComplete } = useWorkspace();
  const [costFilter, setCostFilter] = useState<'all' | 'free' | 'low'>('all');
  const [hours, setHours] = useState(profile.learningHours === null ? '' : String(profile.learningHours));
  const [budget, setBudget] = useState(profile.budgetMYR === null ? '' : String(profile.budgetMYR));
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setHours(profile.learningHours === null ? '' : String(profile.learningHours));
    setBudget(profile.budgetMYR === null ? '' : String(profile.budgetMYR));
  }, [profile.learningHours, profile.budgetMYR]);
  const role = demoRoles.find(r => r.id === targetRoleId) ?? demoRoles[0];
  const built = !!activeBaseline(state);
  const milestones = useMemo(() => roadmapMilestones(state), [state]);
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
    setMsg('Plan updated.');
  };

  return <>
    <div className="panel panel-pad" style={{ marginBottom: 18 }} data-testid="panel-roadmap-target">
      <SectionTitle title="Roadmap target" note={built ? 'BUILT FROM CAREERS & JOBS' : 'NOT BUILT YET'} />
      {built
        ? <p style={{ margin: 0 }}><strong data-testid="text-roadmap-target">{role.title}</strong> <span className="muted">· Only “Build my learning roadmap” in <Link href="/careers-and-jobs?tab=career-paths" className="text-link">Careers & jobs</Link> changes this target.</span></p>
        : <p className="muted" style={{ margin: 0 }}>No roadmap yet. Explore a role in <Link href="/careers-and-jobs?tab=career-paths" className="text-link" data-testid="link-roadmap-careers">Careers & jobs</Link> and choose “Build my learning roadmap”.</p>}
    </div>
    <div className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Progress" note={`${done} OF ${milestones.length} MILESTONES`} />
        <ChiliProgressBar value={milestones.length ? 100 * done / milestones.length : 0} label="Roadmap completion" valueText={`${done} of ${milestones.length} milestones complete`} testId="progress-roadmap" />
        <p className="muted" style={{ marginTop: 10 }} data-testid="text-plan-cost">Total sample cost MYR {totalCost} · {budgetSummary}</p>
        <p className="muted small">Priority skills: {milestones.map(m => m.skill).join(', ') || 'none'}</p>
        <p className="muted small" data-testid="text-roadmap-rule">Completing a milestone tracks progress only; it never changes skill levels. Review and confirm a level change in <button className="record-btn" onClick={onReview} data-testid="button-open-twin">Digital Twin &amp; Progress</button>.</p>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Replan" note="HOURS AND BUDGET" />
        <div className="stack">
          <div className="row"><div className="field" style={{ flex: 1 }}><label htmlFor="rp-h">Hours / week</label><input id="rp-h" type="number" min={1} max={40} className="fr-input" value={hours} onChange={e => setHours(e.target.value)} data-testid="input-replan-hours" /></div>
            <div className="field" style={{ flex: 1 }}><label htmlFor="rp-b">Budget MYR</label><input id="rp-b" type="number" min={0} className="fr-input" value={budget} onChange={e => setBudget(e.target.value)} data-testid="input-replan-budget" /></div></div>
          <button className="btn btn-primary" onClick={apply} data-testid="button-apply-replan">Apply</button>
          {msg && <span className="small" role="status" data-testid="status-replan">{msg}</span>}
        </div>
      </div>
    </div>
    <div className="row" style={{ margin: '18px 0 12px' }}>
      {(['all', 'free', 'low'] as const).map(f => <button key={f} className={`btn btn-small ${costFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCostFilter(f)} aria-pressed={costFilter === f} data-testid={`button-cost-${f}`}>{f === 'all' ? 'All' : f === 'free' ? 'Free' : 'Low cost (MYR 100 or less)'}</button>)}
    </div>
    {!built ? <EmptyBlock title="Your roadmap will appear here.">Milestones are created from the gaps of the role you choose in Careers & jobs.</EmptyBlock>
      : milestones.length === 0 ? <EmptyBlock title="No gaps for this target.">You met every sample requirement when you started. <Link href="/careers-and-jobs?tab=career-paths" className="text-link">Choose another career</Link></EmptyBlock>
      : shown.length === 0 ? <EmptyBlock title="No milestones match this cost filter." />
      : <div className="dashboard-grid">
        <div className="stack">{shown.map(m => { const key = completionKey(state.audience, m.id); const isDone = !!state.completion[key]; return <div key={m.id} className={`milestone${isDone ? ' done' : ''}`} data-testid={`card-milestone-${m.order}`}>
          <input type="checkbox" checked={isDone} onChange={e => setMilestoneComplete(key, e.target.checked)} aria-label={`Mark ${m.title} complete`} data-testid={`checkbox-milestone-${m.order}`} />
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
