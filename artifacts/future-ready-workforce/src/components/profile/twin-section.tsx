import { useState } from 'react';
import { Info } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { completionKey } from '@/domain/services';
import { confirmationFor, currentLevel, progressReport, proposedLevel, roadmapMilestones } from '@/domain/learning';
import { Bar, EmptyBlock, SectionTitle, useLevelLabel } from '@/components/workspace/ui';
import { documentedOverlap, officialBaseline } from '@/domain/official-roadmap';
import { usePathwayProgress } from '@/hooks/use-pathway-progress';
import type { RoadmapBaseline } from '@/domain/types';
import { MatchScore } from '@/components/shared/match-score';

import { useI18n } from '@/i18n/i18n-context';

function Proposal({ milestoneId, skill, required, title }: { milestoneId: string; skill: string; required: number; title: string }) {
  const { ui, locale } = useI18n();
  const { state, confirmSkillUpdate } = useWorkspace();
  const current = currentLevel(state, skill);
  const suggested = proposedLevel(current, required);
  const [level, setLevel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const levelLabel = useLevelLabel();
  const confirmed = confirmationFor(state, milestoneId);
  if (confirmed) return <div className="small" data-testid={`confirmed-${milestoneId}`}>
    <strong>{skill}</strong>: {ui('level {from} → {to} confirmed on {date}.', { from: confirmed.fromLevel, to: confirmed.toLevel, date: new Date(confirmed.confirmedAt).toLocaleDateString(locale) })}</div>;
  const options = [1, 2, 3, 4, 5].filter(n => n > current);
  const chosen = level ?? suggested ?? options[0];
  return <div className="role-card" data-testid={`proposal-${milestoneId}`}>
    <strong>{skill}</strong>
    <span className="small muted">{ui('Completed: {title}. Your level stays {level} until you confirm a change.', { title: ui(title), level: current })}</span>
    {options.length === 0 ? <span className="small">{ui('Already at the highest level.')}</span> : <div className="row">
      <label className="small" htmlFor={`lvl-${milestoneId}`}>{ui('Proposed new level')}</label>
      <select id={`lvl-${milestoneId}`} className="fr-select" value={chosen} onChange={e => setLevel(Number(e.target.value))} data-testid={`select-confirm-level-${milestoneId}`}>
        {options.map(n => <option key={n} value={n}>{n} · {levelLabel(n)}</option>)}</select>
      <button className="btn btn-primary btn-small" onClick={() => setMsg(confirmSkillUpdate(milestoneId, chosen))} data-testid={`button-confirm-${milestoneId}`}>{ui('Confirm level change')}</button>
    </div>}
    {msg && <span className="small" role="alert">{ui(msg)}</span>}
  </div>;
}

function OfficialTwinProgress({ baseline }: { baseline: RoadmapBaseline }) {
  const { ui, locale } = useI18n();
  const pathway = usePathwayProgress();
  const { state, profile } = useWorkspace();
  const occupation = baseline.occupation!;
  const start = documentedOverlap(baseline.skills, occupation);
  const current = documentedOverlap(profile.skills, occupation);
  const milestones = roadmapMilestones(state);
  const completed = milestones.filter(m => state.completion[completionKey(state.audience, m.id)]);
  const confirmations = state.confirmations.filter(c => c.audience === state.audience && c.roleId === state.targets[state.audience]);
  return <section data-testid="section-twin-progress">
    <div className="eyebrow">{ui('Digital twin · official occupation plan')}</div>
    <h2>{ui('Your progress against {role}', { role: occupation.title })}</h2>
    <div className="panel panel-pad" style={{ marginBottom: 18 }}>
      <SectionTitle title={ui('Documented skill overlap')} note={ui('NAME OVERLAP · NOT PROFICIENCY')} />
      <div className="side-by-side">
        <div><p className="small muted">{ui('Starting')}</p><MatchScore metric="onet" variant="bar" value={start.score} matched={start.matched} considered={start.total} testId="text-start-overlap" /></div>
        <div><p className="small muted">{ui('Current')}</p><MatchScore metric="onet" variant="bar" value={current.score} matched={current.matched} considered={current.total} testId="text-current-overlap" /></div>
      </div>
      <p className="muted small">{ui('The original name-overlap formula is unchanged. A higher self-rating for an existing skill does not increase this score. Completing activities alone never changes skills or overlap. No O*NET rating is a 1–5 proficiency target.')}</p>
      <p data-testid="text-twin-summary">{ui('{done} of {total} steps done · {percent}% · {confirmed} confirmed skill updates · {missing} documented skills not in profile', { done: pathway.done, total: pathway.total, percent: pathway.percent, confirmed: confirmations.length, missing: current.total - current.matched })}</p>
      <p className="small muted">{ui('Started {date} · evidence snapshot: O*NET {release}.', { date: new Date(baseline.startedAt).toLocaleDateString(locale), release: occupation.release })}</p>
    </div>
    <div className="panel panel-pad" style={{ marginBottom: 18 }}>
      <SectionTitle title="Review skill updates" note="SELF-RATING · YOU DECIDE" />
      <p className="muted small">{ui('After practice, review your own proficiency. The offered next level is only a self-rating suggestion, not an O*NET requirement or a course award.')}</p>
      {completed.length === 0 ? <p className="muted">{ui('Complete a roadmap milestone to review a possible skill level change.')}</p>
        : <div className="stack">{completed.map(m => <Proposal key={m.id} milestoneId={m.id} skill={m.skill} title={m.title} required={5} />)}</div>}
    </div>
    <div className="panel panel-pad">
      <SectionTitle title="Starting vs current self-ratings" />
      <div style={{ overflowX: 'auto' }}><table className="compare-table" data-testid="table-skill-progress">
        <thead><tr><th>{ui('Documented skill')}</th><th>{ui('Starting')}</th><th>{ui('Current')}</th><th>{ui('Update')}</th></tr></thead>
        <tbody>{occupation.documentedSkills.map(s => {
          const normalize = (v: string) => v.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
          const starting = baseline.skills.find(p => normalize(p.name) === normalize(s.name))?.level ?? 0;
          const level = currentLevel(state, s.name);
          return <tr key={s.elementId}><td>{s.name}</td><td>{starting || ui('Not in profile')}</td><td>{level || ui('Not in profile')}</td>
            <td>{ui(confirmations.some(c => c.skill === s.name) ? 'Confirmed improvement' : level !== starting ? 'Profile edit' : 'Unchanged')}</td></tr>;
        })}</tbody>
      </table></div>
    </div>
  </section>;
}

export function TwinSection() {
  const { ui, locale } = useI18n();
  const pathway = usePathwayProgress();
  const { state } = useWorkspace();
  const report = progressReport(state);
  const completed = roadmapMilestones(state).filter(m => state.completion[completionKey(state.audience, m.id)]);
  const role = report?.role;
  const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`;
  const official = officialBaseline(state);
  if (official) return <OfficialTwinProgress key={`${state.audience}:${state.targets[state.audience]}`} baseline={official} />;
  return <>
    <section aria-labelledby="progress-title" data-testid="section-twin-progress">
      <div className="eyebrow">{ui('Digital twin · actual progress')}</div>
      <h2 id="progress-title" style={{ margin: '2px 0 4px' }}>{ui('Your progress against {role}', { role: role?.title ?? ui('a target role') })}</h2>
      {!report ? <EmptyBlock title={ui('No roadmap to compare yet.')}>{ui('Choose “Build my learning roadmap” in Careers & jobs to record a starting point.')}</EmptyBlock> : <> 
        <div className="dashboard-grid" style={{ margin: '12px 0 18px' }}>
          <div className="panel panel-pad">
            <SectionTitle title="Readiness" note="ILLUSTRATIVE SKILL COVERAGE" />
            <div className="side-by-side">
              <div><span className="small muted">{ui('Starting')}</span><div className="big-num" data-testid="text-start-readiness">{report.start.readiness}%</div></div>
              <div><span className="small muted">{ui('Current')}</span><div className="big-num" data-testid="text-current-readiness">{report.current.readiness}%</div></div>
            </div>
            <Bar value={report.current.readiness} label={ui('Current readiness {percent}%', { percent: report.current.readiness })} />
            <p style={{ margin: '10px 0 0' }}>{ui('Change:')} <b className={report.changePoints > 0 ? 'delta-up' : ''} data-testid="text-progress-change">{ui('{points} percentage points', { points: sign(report.changePoints) })}</b></p>
            <div className="disclaimer"><Info size={14} /><span>{ui('Change = current coverage minus coverage when the roadmap was started, using the same 0–100 skill-coverage score. It reflects skill levels in your saved profile (confirmed learning updates and any profile edits), not completed activities alone. It is not a job or employment probability.')}</span></div>
          </div>
          <div className="panel panel-pad">
            <SectionTitle title="Summary" />
            <p className="small" style={{ margin: 0 }} data-testid="text-twin-summary">{ui('{done} of {total} steps done · {percent}% · {confirmed} confirmed skill updates · {gaps} gaps remaining', { done: pathway.done, total: pathway.total, percent: pathway.percent, confirmed: report.confirmations.length, gaps: report.current.gaps.length })}</p>
            <p className="muted small">{report.startedAt.startsWith('1970') ? ui('Started before progress tracking was added.') : ui('Started {date}.', { date: new Date(report.startedAt).toLocaleDateString(locale) })}</p>
          </div>
        </div>
        <div className="panel panel-pad" style={{ marginBottom: 18 }}>
          <SectionTitle title="Review skill updates" note="YOU DECIDE" />
          {completed.length === 0 ? <p className="muted">{ui('Complete a roadmap milestone to review a possible skill level change. Completion alone never changes your levels.')}</p>
            : <div className="stack">{completed.map(m => <Proposal key={m.id} milestoneId={m.id} skill={m.skill} title={m.title} required={report.role.requiredSkills.find(r => r.name === m.skill)?.level ?? 5} />)}</div>}
        </div>
        <div className="panel panel-pad" style={{ marginBottom: 18 }}>
          <SectionTitle title="Starting vs current levels" />
          <table className="compare-table" data-testid="table-skill-progress"><thead><tr><th>{ui('Skill')}</th><th>{ui('Required')}</th><th>{ui('Starting')}</th><th>{ui('Current')}</th><th>{ui('Status')}</th></tr></thead>
            <tbody>{report.skillRows.map(r => <tr key={r.name}><td>{r.name}</td><td>{r.required}</td><td>{r.startLevel}</td><td>{r.currentLevel}</td>
              <td>{r.currentLevel >= r.required ? ui('Requirement met') : ui('{n} below', { n: r.required - r.currentLevel })}{r.confirmed ? ` · ${ui('confirmed improvement')}` : r.currentLevel !== r.startLevel ? ` · ${ui('profile edit')}` : ''}</td></tr>)}</tbody></table>
        </div>
        <div className="panel panel-pad" style={{ marginBottom: 24 }}>
          <SectionTitle title="Completed activities" />
          {report.completed.length === 0 ? <p className="muted">{ui('None yet.')}</p> : report.completed.map(c => <div key={c.milestone.id} className="week-row"><span className="mono">{c.completedAt && !c.completedAt.startsWith('1970') ? new Date(c.completedAt).toLocaleDateString(locale) : '—'}</span><span>{ui(c.milestone.title)}</span></div>)}
        </div>
      </>}
    </section>
  </>;
}
