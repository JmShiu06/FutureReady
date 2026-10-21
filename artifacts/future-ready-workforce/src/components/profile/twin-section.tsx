import { useState } from 'react';
import { Info } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { completionKey } from '@/domain/services';
import { confirmationFor, currentLevel, progressReport, proposedLevel, roadmapMilestones } from '@/domain/learning';
import { Bar, EmptyBlock, SectionTitle, levelLabel } from '@/components/workspace/ui';
import { Simulator } from './simulator';

function Proposal({ milestoneId, skill, required, title }: { milestoneId: string; skill: string; required: number; title: string }) {
  const { state, confirmSkillUpdate } = useWorkspace();
  const current = currentLevel(state, skill);
  const suggested = proposedLevel(current, required);
  const [level, setLevel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const confirmed = confirmationFor(state, milestoneId);
  if (confirmed) return <div className="small" data-testid={`confirmed-${milestoneId}`}>
    <strong>{skill}</strong>: level {confirmed.fromLevel} → {confirmed.toLevel} confirmed on {new Date(confirmed.confirmedAt).toLocaleDateString()}.</div>;
  const options = [1, 2, 3, 4, 5].filter(n => n > current);
  const chosen = level ?? suggested ?? options[0];
  return <div className="role-card" data-testid={`proposal-${milestoneId}`}>
    <strong>{skill}</strong>
    <span className="small muted">Completed: {title}. Your level stays {current} until you confirm a change.</span>
    {options.length === 0 ? <span className="small">Already at the highest level.</span> : <div className="row">
      <label className="small" htmlFor={`lvl-${milestoneId}`}>Proposed new level</label>
      <select id={`lvl-${milestoneId}`} className="fr-select" value={chosen} onChange={e => setLevel(Number(e.target.value))} data-testid={`select-confirm-level-${milestoneId}`}>
        {options.map(n => <option key={n} value={n}>{n} · {levelLabel(n)}</option>)}</select>
      <button className="btn btn-primary btn-small" onClick={() => setMsg(confirmSkillUpdate(milestoneId, chosen))} data-testid={`button-confirm-${milestoneId}`}>Confirm level change</button>
    </div>}
    {msg && <span className="small" role="alert">{msg}</span>}
  </div>;
}

export function TwinSection() {
  const { state } = useWorkspace();
  const report = progressReport(state);
  const completed = roadmapMilestones(state).filter(m => state.completion[completionKey(state.audience, m.id)]);
  const role = report?.role;
  const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`;
  return <>
    <section aria-labelledby="progress-title" data-testid="section-twin-progress">
      <div className="eyebrow">Digital twin · actual progress</div>
      <h2 id="progress-title" style={{ margin: '2px 0 4px' }}>Your progress against {role?.title ?? 'a target role'}</h2>
      {!report ? <EmptyBlock title="No roadmap to compare yet.">Choose “Build my learning roadmap” in Career explorer to record a starting point.</EmptyBlock> : <>
        <div className="dashboard-grid" style={{ margin: '12px 0 18px' }}>
          <div className="panel panel-pad">
            <SectionTitle title="Readiness" note="ILLUSTRATIVE SKILL COVERAGE" />
            <div className="side-by-side">
              <div><span className="small muted">Starting</span><div className="big-num" data-testid="text-start-readiness">{report.start.readiness}%</div></div>
              <div><span className="small muted">Current</span><div className="big-num" data-testid="text-current-readiness">{report.current.readiness}%</div></div>
            </div>
            <Bar value={report.current.readiness} label={`Current readiness ${report.current.readiness}%`} />
            <p style={{ margin: '10px 0 0' }}>Change: <b className={report.changePoints > 0 ? 'delta-up' : ''} data-testid="text-progress-change">{sign(report.changePoints)} percentage points</b></p>
            <div className="disclaimer"><Info size={14} /><span>Change = current coverage minus coverage when the roadmap was started, using the same 0–100 skill-coverage score. It reflects skill levels in your saved profile (confirmed learning updates and any profile edits), not completed activities alone. It is not a job or employment probability.</span></div>
          </div>
          <div className="panel panel-pad">
            <SectionTitle title="Summary" />
            <p className="small" style={{ margin: 0 }} data-testid="text-twin-summary">{completed.length} completed activit{completed.length === 1 ? 'y' : 'ies'} · {report.confirmations.length} confirmed skill update{report.confirmations.length === 1 ? '' : 's'} · {report.current.gaps.length} gap{report.current.gaps.length === 1 ? '' : 's'} remaining</p>
            <p className="muted small">Started {report.startedAt.startsWith('1970') ? 'before progress tracking was added' : new Date(report.startedAt).toLocaleDateString()}.</p>
          </div>
        </div>
        <div className="panel panel-pad" style={{ marginBottom: 18 }}>
          <SectionTitle title="Review skill updates" note="YOU DECIDE" />
          {completed.length === 0 ? <p className="muted">Complete a roadmap milestone to review a possible skill level change. Completion alone never changes your levels.</p>
            : <div className="stack">{completed.map(m => <Proposal key={m.id} milestoneId={m.id} skill={m.skill} title={m.title} required={report.role.requiredSkills.find(r => r.name === m.skill)?.level ?? 5} />)}</div>}
        </div>
        <div className="panel panel-pad" style={{ marginBottom: 18 }}>
          <SectionTitle title="Starting vs current levels" />
          <table className="compare-table" data-testid="table-skill-progress"><thead><tr><th>Skill</th><th>Required</th><th>Starting</th><th>Current</th><th>Status</th></tr></thead>
            <tbody>{report.skillRows.map(r => <tr key={r.name}><td>{r.name}</td><td>{r.required}</td><td>{r.startLevel}</td><td>{r.currentLevel}</td>
              <td>{r.currentLevel >= r.required ? 'Requirement met' : `${r.required - r.currentLevel} below`}{r.confirmed ? ' · confirmed improvement' : r.currentLevel !== r.startLevel ? ' · profile edit' : ''}</td></tr>)}</tbody></table>
        </div>
        <div className="panel panel-pad" style={{ marginBottom: 24 }}>
          <SectionTitle title="Completed activities" />
          {report.completed.length === 0 ? <p className="muted">None yet.</p> : report.completed.map(c => <div key={c.milestone.id} className="week-row"><span className="mono">{c.completedAt && !c.completedAt.startsWith('1970') ? new Date(c.completedAt).toLocaleDateString() : '—'}</span><span>{c.milestone.title}</span></div>)}
        </div>
      </>}
    </section>
    <Simulator />
  </>;
}
