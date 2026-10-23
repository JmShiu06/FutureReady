import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Info, RotateCcw } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { demoRoles } from '@/domain/demo-data';
import { completionKey } from '@/domain/services';
import { activeBaseline, roadmapMilestones } from '@/domain/learning';
import { ChiliProgressBar } from '@/components/chili-progress-bar';
import { EmptyBlock, PriorityTag, SectionTitle } from '@/components/workspace/ui';
import { BuildRoadmapButton } from '@/components/build-roadmap-button';
import { learningResourceCatalog, scenarioSkillBonus, aiSkillAdjustment, type PlanningScenario } from '@workspace/workforce-evidence';
import { learningSchedule } from '@/domain/learning-schedule';
import { SdgUseCase } from '@/components/shared/sdg-use-case';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function RoadmapSection({ onReview }: { onReview: () => void }) {
  const { state, profile, targetRoleId, saveProfile, setMilestoneComplete, resetActiveRoadmap, planningScenario: scenario, setPlanningScenario: setScenario, planningEffects, isSyntheticDemo } = useWorkspace();
  const [costFilter, setCostFilter] = useState<'all' | 'free' | 'low'>('all');
  const [hours, setHours] = useState(profile.learningHours === null ? '' : String(profile.learningHours));
  const [budget, setBudget] = useState(profile.budgetMYR === null ? '' : String(profile.budgetMYR));
  const [msg, setMsg] = useState('');
  const [goalWeeks, setGoalWeeks] = useState('');
  useEffect(() => {
    setHours(profile.learningHours === null ? '' : String(profile.learningHours));
    setBudget(profile.budgetMYR === null ? '' : String(profile.budgetMYR));
  }, [profile.learningHours, profile.budgetMYR]);
  const baseline = activeBaseline(state);
  const occupation = baseline?.occupation;
  const role = demoRoles.find(r => r.id === targetRoleId);
  const savedPlans = Object.entries(state.baselines).filter(([key]) => key.startsWith(`${state.audience}:`));
  const built = !!activeBaseline(state);
  const milestones = useMemo(() => roadmapMilestones(state).sort((a, b) => {
    if (!occupation) return a.order - b.order;
    const score = (m: typeof a) => 12 * (occupation.documentedSkills.find(s => s.name === m.skill)?.importance ?? 0) + scenarioSkillBonus(m.skill, scenario) + aiSkillAdjustment(m.skill, planningEffects, scenario);
    return score(b) - score(a) || a.order - b.order;
  }).map((m, i) => ({ ...m, order: i + 1 })), [state, occupation, scenario, planningEffects]);
  const shown = milestones.filter(m => costFilter === 'all' || (m.costMYR !== null && (costFilter === 'free' ? m.costMYR === 0 : m.costMYR <= 100)));
  const done = milestones.filter(m => state.completion[completionKey(state.audience, m.id)]).length;
  const totalCost = milestones.reduce((t, m) => t + (m.costMYR ?? 0), 0);
  const unknownCosts = milestones.filter(m => m.costMYR === null).length;
  const schedule = profile.learningHours === null ? [] : learningSchedule(milestones.filter(m => !state.completion[completionKey(state.audience, m.id)]), profile.learningHours);
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
      <SectionTitle title="Roadmap target" note={built ? 'BUILT FROM CAREERS & JOBS' : 'NOT BUILT YET'}
        action={built ? <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="btn btn-secondary btn-small" data-testid="button-reset-roadmap"><RotateCcw size={14} /> Reset roadmap</button>
          </AlertDialogTrigger>
          <AlertDialogContent className="roadmap-reset-dialog" data-testid="dialog-reset-roadmap">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset this roadmap?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes this roadmap and its milestone completion and confirmation history. Your saved profile skills, learning hours and budget will stay unchanged. Other audiences’ roadmaps are not affected. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-reset-roadmap">Keep roadmap</AlertDialogCancel>
              <AlertDialogAction onClick={resetActiveRoadmap} data-testid="button-confirm-reset-roadmap">Reset roadmap</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog> : undefined} />
      {built
        ? <p style={{ margin: 0 }}><strong data-testid="text-roadmap-target">{occupation?.title ?? role?.title}</strong> <span className="muted">· Only an explicit Build or Resume action changes this target. Browsing <Link href="/careers-and-jobs?tab=career-paths" className="text-link">Careers & jobs</Link> never does.</span></p>
        : <p className="muted" style={{ margin: 0 }}>No roadmap yet. Explore a role in <Link href="/careers-and-jobs?tab=career-paths" className="text-link" data-testid="link-roadmap-careers">Careers & jobs</Link> and choose “Build my learning roadmap”.</p>}
      {occupation && <div className="stack" style={{ marginTop: 12 }} data-testid="text-official-roadmap-evidence">
        <span className="small">{occupation.edition} · MASCO {occupation.masco4} → O*NET {occupation.onetCode} {occupation.onetTitle} · release {occupation.release}</span>
        <p className="muted small">Plan saved from documented skills absent by name at build time, ordered by O*NET importance. O*NET levels (0–7) are not proficiency targets (1–5). Existing skills are not assessed for mastery. Milestones remain fixed after profile edits.</p>
        <span className="muted small">{occupation.selectionRule} {occupation.mappingLimitations}</span>
        <a href={occupation.sourceUrl} target="_blank" rel="noreferrer" className="text-link" data-testid="link-roadmap-onet">O*NET skill evidence (CC BY 4.0)</a>
        <span className="muted small">Learning catalogue reviewed {learningResourceCatalog.reviewed_at}. Only exact reviewed skill coverage is used; a Programming requirement does not establish a Python course match.</span>
      </div>}
      {savedPlans.length > 0 && <details style={{ marginTop: 12 }} data-testid="details-saved-roadmaps"><summary>Saved roadmaps for this audience</summary>
        <div className="stack" style={{ marginTop: 10 }}>{savedPlans.map(([key, saved]) => {
          const id = key.slice(state.audience.length + 1);
          return <div className="spread" key={key}><span>{saved.occupation?.title ?? demoRoles.find(r => r.id === id)?.title}</span>
            <BuildRoadmapButton roleId={id} testId={`button-resume-${id}`} /></div>;
        })}</div></details>}
    </div>
    <div className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Progress" note={`${done} OF ${milestones.length} MILESTONES`} />
        <ChiliProgressBar value={milestones.length ? 100 * done / milestones.length : 0} label="Roadmap completion" valueText={`${done} of ${milestones.length} milestones complete`} testId="progress-roadmap" />
        <p className="muted" style={{ marginTop: 10 }} data-testid="text-plan-cost">{occupation ? 'Known resource cost' : 'Total sample cost'} MYR {totalCost} · {unknownCosts ? `${unknownCosts} activities have unknown cost; a full budget comparison is unavailable.` : budgetSummary}</p>
        <p className="muted small">Priority skills: {milestones.map(m => m.skill).join(', ') || 'none'}</p>
        <p className="muted small" data-testid="text-roadmap-rule">Completing a milestone tracks progress only; it never changes skill levels. Review and confirm a level change in <button className="record-btn" onClick={onReview} data-testid="button-open-twin">Digital Twin &amp; Progress</button>.</p>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Replan" note="HOURS AND BUDGET" />
        <div className="stack">
          {occupation && <div className="field"><label htmlFor="roadmap-scenario">Planning scenario (app assumptions)</label>
            <select id="roadmap-scenario" className="fr-select" value={scenario} onChange={e => setScenario(e.target.value as PlanningScenario)} data-testid="select-roadmap-scenario"><option value="moderate">Moderate AI disruption</option><option value="fast">Fast AI disruption</option></select>
            <span className="small muted">Reorders gaps only; does not change saved completion or skill levels. Priority = 12 × O*NET importance + scenario skill bonus. Inspect assumptions in Market &amp; AI impact.</span></div>}
          {isSyntheticDemo && <p className="disclaimer">ISOLATED SYNTHETIC ROADMAP · not written over your real saved progress.</p>}
          <div className="field"><label htmlFor="roadmap-goal-weeks">Optional completion window (weeks)</label><input id="roadmap-goal-weeks" className="fr-input" type="number" min="1" max="104" value={goalWeeks} onChange={e => setGoalWeeks(e.target.value)} data-testid="input-roadmap-goal-weeks" /></div>
          {Number(goalWeeks) > 0 && profile.learningHours !== null && milestones.filter(m => !state.completion[completionKey(state.audience, m.id)]).reduce((n, m) => n + (m.durationHours ?? 0), 0) > Number(goalWeeks) * profile.learningHours && <p role="alert" className="disclaimer" data-testid="roadmap-infeasible">Not feasible within {goalWeeks} weeks at {profile.learningHours} hours/week. Increase time, extend the window or choose a smaller learning goal; no completed steps are discarded.</p>}
          <p className="small muted">Budget feasibility covers listed learning content only; device/internet and optional credentials are excluded. Unknown paid-course prices are not treated as affordable. AI evidence changes order through bounded skill weights; it does not remove steps or change proficiency.</p>
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
      : milestones.length === 0 ? <EmptyBlock title="No gaps for this target.">{occupation ? 'Every selected documented skill was in your starting profile by name. This is not a proficiency assessment.' : 'You met every sample requirement when you started.'} <Link href="/careers-and-jobs?tab=career-paths" className="text-link">Choose another career</Link></EmptyBlock>
      : shown.length === 0 ? <EmptyBlock title="No milestones match this cost filter." />
      : <div className="dashboard-grid">
        <div className="stack">{shown.map(m => { const key = completionKey(state.audience, m.id); const isDone = !!state.completion[key]; return <div key={m.id} className={`milestone${isDone ? ' done' : ''}`} data-testid={`card-milestone-${m.order}`}>
          <input type="checkbox" checked={isDone} onChange={e => setMilestoneComplete(key, e.target.checked)} aria-label={`Mark ${m.title} complete`} data-testid={`checkbox-milestone-${m.order}`} />
          <div className="stack" style={{ gap: 6 }}>
            <div className="spread"><h3>{m.order}. {m.title}</h3>{!occupation && <PriorityTag priority={m.priority} />}</div>
            {occupation && <span className="small muted">{m.skill} · O*NET importance {occupation.documentedSkills.find(s => s.name === m.skill)?.importance.toFixed(2)} / 5 · no self-rating target</span>}
             <span className="small">{m.provider} · {m.durationHours === null ? 'Duration unknown' : `${m.durationHours.toFixed(2).replace(/\.00$/, '')} hrs`} · {m.costMYR === null ? 'Cost unknown' : m.costMYR === 0 ? 'No learning-content purchase required' : `MYR ${m.costMYR}`}{m.synthetic ? ' · synthetic' : ''}</span>
             {m.timeBasis && <span className="small muted">{m.timeBasis} · reviewed {m.reviewedAt}</span>}
             {m.activity && <p className="small">{m.activity}</p>}
             {m.coverage && <p className="small muted">{m.coverage} {m.costCaveat}</p>}
            <span className="small">{m.verifiedUrl ? <a href={m.verifiedUrl} target="_blank" rel="noreferrer" className="text-link" data-testid={`link-resource-${m.order}`}>{m.verifiedUrl}</a> : occupation ? 'No verified resource in the current catalogue. This is a planning activity, not a course recommendation.' : 'No verified URL — fictional example'}</span>
            <span className="small muted">Prerequisites: {m.prerequisites.join('; ')}</span>
             {occupation && <><a className="text-link small" href={m.evidenceUrl ?? occupation.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-step-evidence-${m.order}`}>O*NET skill evidence · {occupation.release}</a><SdgUseCase roleId={occupation.id} skill={m.skill} /></>}
          </div></div>; })}</div>
        <div className="panel panel-pad"><SectionTitle title="Weekly schedule" note={profile.learningHours === null ? 'SET HOURS IN REPLAN' : `AT ${profile.learningHours} HRS / WEEK`} />
          {profile.learningHours === null
            ? <p className="muted">Set weekly learning hours in Replan to calculate a schedule.</p>
             : schedule.map(s => <div key={s.week} className="week-row"><span className="mono">Wk {s.week}</span><span>{s.activities.map(a => `${a.skill} (${a.hours.toFixed(1)}h)`).join('; ')}</span></div>)}
           <div className="disclaimer"><Info size={14} /><span>Remaining activities are packed in order into your weekly capacity. Course times are provider estimates; practice times are app estimates. Completed steps are omitted. Unknown-duration activities are not scheduled.</span></div></div>
      </div>}
  </>;
}
