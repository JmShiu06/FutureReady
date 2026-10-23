import { useState } from 'react';
import { BookOpen, Check, ExternalLink, FlaskConical, Hammer, Layers, Printer, RotateCcw, Sparkles, Target } from 'lucide-react';
import type { PathwayPlan, PathwayStep } from '@/domain/reskilling-pathway';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import '@/styles/pathway.css';

type Resource = NonNullable<PathwayStep['resource']>;
type Phase = PathwayStep['phase'];

export type PathwayViewProps = {
  plan: PathwayPlan; targetTitle: string; sampleLabel?: string;
  hours: number; budget: number; freeOnly: boolean; scenario: 'moderate' | 'fast';
  planScenario?: 'moderate' | 'fast';
  onHoursChange: (n: number) => void; onBudgetChange: (n: number) => void;
  onFreeOnlyChange: (b: boolean) => void; onScenarioChange: (s: 'moderate' | 'fast') => void;
  isDone: (step: PathwayStep) => boolean; onToggle: (step: PathwayStep, done: boolean) => void;
  onReviewTwin: () => void; onReset: () => void;
  pendingChange?: { reason: string; changes: string[] };
  onAcceptChanges: () => void; onKeepPlan: () => void; storageWarning?: string;
};

export type PathwayEmptyProps = {
  presets: { id: string; label: string; description: string }[];
  selectedPresetId: string | null; onSelectPreset: (id: string) => void;
  roles: { id: string; title: string }[]; onBuild: (roleId: string) => void;
  loading: boolean; error: string; onPickRole: () => void;
};

const PHASES: { key: Phase; cls: string; Icon: typeof Layers; note: string }[] = [
  { key: 'Foundation', cls: 'pw-ph-foundation', Icon: Layers, note: 'Groundwork that the later skills lean on.' },
  { key: 'Core skills', cls: 'pw-ph-core', Icon: Target, note: 'The gaps that matter most for this role.' },
  { key: 'Apply it', cls: 'pw-ph-apply', Icon: Hammer, note: 'Show the skills working together.' },
];

const myr = (n: number) => `MYR ${n.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`;
const safeUrl = (u: string | null | undefined) => (u && /^https:\/\//i.test(u) ? u : null);

function Sdgs({ ids, testid }: { ids: number[]; testid: string }) {
  if (!ids.length) return null;
  return <ul className="pw-sdgs" aria-label="Related UN Sustainable Development Goals" title="App-reviewed learning intentions, not provider endorsement or measured SDG impact." data-testid={testid}>
    {ids.map(n => <li key={n} className="pw-sdg">SDG {n}</li>)}
  </ul>;
}

function ResourceBlock({ step }: { step: PathwayStep }) {
  const r = step.resource;
  if (step.kind === 'project') {
    return <div className="pw-resource pw-project" data-testid={`text-project-${step.id}`}>
      <span className="pw-tag">Portfolio project · written by FutureReady</span>
      <div className="pw-chips"><span className="pw-chip">MYR 0</span><span className="pw-chip">{step.hours} hrs · ~{step.weeks} {step.weeks === 1 ? 'week' : 'weeks'} · app estimate</span></div>
      <p>{step.activity}</p>
      <small>This is a fictional practice brief created by this app, not a provider course. There is no course link.</small>
    </div>;
  }
  if (!r || step.status === 'no-resource') {
    return <div className="pw-resource pw-missing" data-testid={`text-missing-${step.id}`}>
      <strong>No verified resource yet</strong><small>We won't invent one. Search your employer's or HRD Corp's catalogue for “{step.skill}”.</small>
    </div>;
  }
  if (step.status === 'price-unconfirmed') {
    return <div className="pw-resource pw-missing" data-testid={`text-price-unconfirmed-${step.id}`}>
      <strong>Price unconfirmed</strong><small>“{r.title}” has reviewed skill coverage, but its price is not confirmed. Check the price with the provider before including it in your budget. Free access is not assumed.</small>
    </div>;
  }
  if (step.status === 'budget') {
    return <div className="pw-resource pw-missing" data-testid={`text-budget-${step.id}`}>
      <strong>No match within your budget</strong><small>The closest verified option is “{r.title}” ({r.cost}). Raise the budget or turn off free-only to see it.</small>
    </div>;
  }
  const url = safeUrl(r.url);
  return <div className="pw-resource" data-testid={`card-resource-${step.id}`}>
    <strong className="pw-res-title">{r.title}</strong>
    <div className="pw-chips">
      <span className="pw-chip">{r.provider}</span>
      <span className="pw-chip">{step.status === 'check-availability' ? 'Cost not verified' : r.cost}</span>
      <span className="pw-chip">{step.hours != null ? `${step.hours} hrs · ~${step.weeks} ${step.weeks === 1 ? 'week' : 'weeks'}` : 'Duration not stated'}</span>
      <span className="pw-chip">{r.level}</span>
      {step.status === 'check-availability' && <span className="pw-chip pw-chip-warn">Check availability</span>}
    </div>
    {url && <a className="btn btn-secondary btn-small pw-open" href={url} target="_blank" rel="noopener noreferrer" data-testid={`link-course-${step.id}`}>Open course <ExternalLink size={12} /></a>}
  </div>;
}

function WhyDetails({ step, r }: { step: PathwayStep; r: Resource | null }) {
  return <details className="pw-why" data-testid={`details-why-${step.id}`}>
    <summary>Why this step?</summary>
    <dl>
      <dt>Gap priority</dt><dd>{step.priority.toFixed(1)}{step.importance != null ? ` · role importance ${step.importance}` : ''}</dd>
      {step.kind !== 'project' && <><dt>Calculation</dt><dd>{step.importance != null
        ? 'Existing priority = clamp(12 × O*NET importance + 0.2 × (0.7 × signal index + 0.3 × trend index) + scenario bonus, 0–100). Gaps are skill names absent from the saved starting profile, not assessed proficiency deficits.'
        : 'Sample-role High / Medium / Low priority is used for ordering only, with the existing scenario bonus. This is not an official O*NET proficiency assessment.'} Foundation basics precede core work. Within each phase, the existing priority places higher-emphasis skills first. Scenario effects are workshop assumptions, not measured skill-demand growth.</dd></>}
      {step.scenarioBonus > 0 && <><dt>Scenario bonus</dt><dd>+{step.scenarioBonus.toFixed(1)}</dd></>}
      {step.marketEvidence && <><dt>Planning inputs</dt><dd>{step.marketEvidence.scenario === 'fast' ? 'Fast' : 'Moderate'} scenario · signal index {step.marketEvidence.signalIndex} · trend index {step.marketEvidence.trendIndex} · {step.marketEvidence.period}
        {safeUrl(step.marketEvidence.url) && <> · <a className="pw-link" href={step.marketEvidence.url} target="_blank" rel="noopener noreferrer">DOSM workbook</a></>}</dd></>}
      {step.coveredSkills.length > 1 && <><dt>Also covers</dt><dd>{step.coveredSkills.join(', ')}</dd></>}
      <dt>Resource choice</dt><dd>{step.whyResource || '—'}</dd>
      {r && <><dt>Source</dt><dd>{safeUrl(r.sourceUrl) ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="pw-link">{r.provider}</a> : r.provider}</dd>
        <dt>Verified</dt><dd>{r.verified_on}</dd>
        <dt>Coverage</dt><dd>{r.coverage}</dd>
        <dt>Limitations</dt><dd>{[r.timeBasis, r.costCaveat].filter(Boolean).join(' ') || 'None noted.'}</dd></>}
      {step.evidenceUrl && safeUrl(step.evidenceUrl) && <><dt>Evidence</dt><dd className="pw-evidence"><a className="pw-link" href={step.evidenceUrl} target="_blank" rel="noopener noreferrer">Role skill evidence</a></dd></>}
    </dl>
  </details>;
}

function StepCard({ step, index, done, onToggle }: { step: PathwayStep; index: number; done: boolean; onToggle: (d: boolean) => void }) {
  const Icon = step.kind === 'project' ? Hammer : BookOpen;
  const checkbox = <label className="pw-done" data-testid={`label-done-${step.id}`}>
    <input type="checkbox" checked={done} onChange={e => onToggle(e.target.checked)} data-testid={`checkbox-done-${step.id}`} />
    <span>{done ? 'Done' : 'Mark done'}</span>
  </label>;
  const body = <div className="pw-body">
    <p className="pw-whyline">{step.why}</p>
    <ResourceBlock step={step} />
    <Sdgs ids={step.sdgs} testid={`list-sdgs-${step.id}`} />
    <WhyDetails step={step} r={step.resource} />
  </div>;
  return <li className={`pw-step${done ? ' is-done' : ''}`} data-testid={`card-step-${step.id}`}>
    <span className="pw-node" aria-hidden>{done ? <Check size={15} /> : index}</span>
    <article className="pw-card">
      <header className="pw-card-head">
        <div className="pw-title">
          <span className="pw-kind"><Icon size={12} /> {step.kind === 'project' ? 'Project' : 'Course'} · Step {index}</span>
          <h3 data-testid={`text-step-skill-${step.id}`}>{step.skill}</h3>
        </div>
        {checkbox}
      </header>
      {done ? <details className="pw-collapsed"><summary>Completed — show details</summary>{body}</details> : body}
    </article>
  </li>;
}

export function PathwayView(p: PathwayViewProps) {
  const { plan } = p;
  const [reviewOpen, setReviewOpen] = useState(false);
  const doneCount = plan.steps.filter(p.isDone).length;
  const total = plan.steps.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const sources = Array.from(new Set(plan.steps.map(s => s.resource && safeUrl(s.resource.url)).filter((u): u is string => !!u)));
  let n = 0;
  const printPlan = () => {
    const collapsed = [...document.querySelectorAll<HTMLDetailsElement>('.pw-collapsed:not([open])')];
    collapsed.forEach(d => { d.open = true; });
    window.addEventListener('afterprint', () => collapsed.forEach(d => { d.open = false; }), { once: true });
    window.print();
  };

  return <section className="pw" data-testid="pathway-view">
    {p.sampleLabel && <div className="pw-sample" data-testid="text-sample-label"><FlaskConical size={14} /> Sample profile: {p.sampleLabel}. Your saved profile is untouched.</div>}
    {p.storageWarning && <div className="banner banner-warn pw-noprint" data-testid="text-storage-warning">{p.storageWarning}</div>}

    {p.pendingChange && <div className="pw-pending pw-noprint" role="status" data-testid="banner-pending-change">
      <div><strong>Your plan changed because {p.pendingChange.reason}</strong>
        <button type="button" className="text-link" aria-expanded={reviewOpen} onClick={() => setReviewOpen(o => !o)} data-testid="button-review-changes">{reviewOpen ? 'Hide changes' : 'Review changes'}</button></div>
      {reviewOpen && <>
        <ul className="pw-change-list" data-testid="list-pending-changes">{p.pendingChange.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
        <div className="row">
          <button type="button" className="btn btn-primary btn-small" onClick={p.onAcceptChanges} data-testid="button-apply-updates">Apply updates</button>
          <button type="button" className="btn btn-quiet btn-small" onClick={p.onKeepPlan} data-testid="button-keep-order">Keep current order</button>
        </div>
      </>}
    </div>}

    <div className="pw-summary panel">
      <div className="pw-summary-top">
        <div>
          <div className="eyebrow">Your reskilling pathway</div>
          <h2 className="pw-target" data-testid="text-target-title">{p.targetTitle}</h2>
          <p className="pw-time" data-testid="text-plan-time">~{plan.totalWeeks} {plan.unknownDurationCount ? 'known weeks' : 'weeks'} at {p.hours} hrs/week{plan.finishDate ? ` · planned finish around ${plan.finishDate}` : plan.unknownDurationCount ? ' · full finish date unavailable until missing resources are confirmed' : ''}</p>
        </div>
        <div className="row pw-noprint">
          <button type="button" className="btn btn-quiet btn-small" onClick={printPlan} data-testid="button-print-plan"><Printer size={13} /> Print / Save as PDF</button>
          <AlertDialog>
            <AlertDialogTrigger asChild><button type="button" className="btn btn-quiet btn-small" data-testid="button-reset-plan"><RotateCcw size={13} /> Reset</button></AlertDialogTrigger>
            <AlertDialogContent className="roadmap-reset-dialog">
              <AlertDialogHeader><AlertDialogTitle>Reset this roadmap?</AlertDialogTitle>
                <AlertDialogDescription>This removes the active roadmap and its progress. Your profile skills are not changed.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel data-testid="button-reset-cancel">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={p.onReset} data-testid="button-reset-confirm">Reset roadmap</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <dl className="pw-stats">
        <div><dt>Total time</dt><dd data-testid="text-total-hours">{plan.totalHours} hrs{plan.unknownDurationCount ? <small> + {plan.unknownDurationCount} unstated</small> : null}</dd></div>
        <div><dt>{plan.unavailableCount ? 'Known cost' : 'Total cost'}</dt><dd data-testid="text-total-cost">{myr(plan.totalCostMYR)}{plan.unavailableCount ? <small> · full cost unknown</small> : null}</dd></div>
        <div><dt>Steps</dt><dd data-testid="text-step-count">{total}{plan.unavailableCount ? <small> · {plan.unavailableCount} without resource</small> : null}</dd></div>
        <div><dt>Skills to build</dt><dd data-testid="text-skill-count">{plan.skills.length}</dd></div>
      </dl>
      {!!plan.sdgs.length && <div className="pw-support"><span>This path supports these SDG learning intentions:</span><Sdgs ids={plan.sdgs} testid="list-plan-sdgs" /></div>}
      <div className="pw-progress" data-testid="text-progress">
        <div className="spread"><span>{doneCount} of {total} steps done</span><b>{pct}%</b></div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pathway progress"><i style={{ width: '100%', transform: `scaleX(${pct / 100})` }} /></div>
      </div>
      <div className="pw-controls pw-noprint">
        <div className="field"><label htmlFor="pw-hours">Hours per week: {p.hours}</label>
          <input id="pw-hours" type="range" min={1} max={40} value={p.hours} onChange={e => p.onHoursChange(Number(e.target.value))} data-testid="input-hours" /></div>
        <div className="field"><label htmlFor="pw-budget">Budget (MYR)</label>
          <input id="pw-budget" className="fr-input" type="number" min={0} max={100000} step={50} value={p.budget} onChange={e => p.onBudgetChange(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))} data-testid="input-budget" /></div>
        <div className="field"><label htmlFor="pw-scenario">Scenario</label>
          <select id="pw-scenario" className="fr-select" value={p.scenario} onChange={e => p.onScenarioChange(e.target.value as 'moderate' | 'fast')} data-testid="select-scenario">
            <option value="moderate">Moderate AI change</option><option value="fast">Fast AI change</option></select></div>
        <label className="pw-free" htmlFor="pw-free"><input id="pw-free" type="checkbox" checked={p.freeOnly} onChange={e => p.onFreeOnlyChange(e.target.checked)} data-testid="checkbox-free-only" /> Free resources only</label>
      </div>
      {p.planScenario && p.planScenario !== p.scenario && <p className="muted small" data-testid="text-saved-order">Using your saved {p.planScenario === 'moderate' ? 'Moderate' : 'Fast'} ordering. The selected scenario applies only after you review and approve the changes.</p>}
    </div>

    {!total && <div className="panel panel-pad" data-testid="text-no-pathway-gaps">No documented skill names were missing from your starting profile. This is not a proficiency assessment. You can pick another role in Careers &amp; jobs.</div>}
    {PHASES.map(ph => {
      const steps = plan.steps.filter(s => s.phase === ph.key);
      if (!steps.length) return null;
      return <section key={ph.key} className={`pw-phase ${ph.cls}`} data-testid={`section-phase-${ph.key.replace(/\s/g, '-').toLowerCase()}`}>
        <header className="pw-phase-head"><span className="pw-phase-icon" aria-hidden><ph.Icon size={15} /></span>
          <div><h2>{ph.key}</h2><p>{ph.note}</p></div></header>
        <ol className="pw-steps">{steps.map(s => { n += 1; return <StepCard key={s.id} step={s} index={n} done={p.isDone(s)} onToggle={d => p.onToggle(s, d)} />; })}</ol>
      </section>;
    })}

    <div className="pw-twin pw-noprint">
      <p>Ticking steps tracks progress only — it doesn't change your skill levels.</p>
      <button type="button" className="btn btn-secondary btn-small" onClick={p.onReviewTwin} data-testid="button-review-twin"><FlaskConical size={13} /> Digital Twin & Progress</button>
    </div>

    <footer className="pw-footer" data-testid="text-pathway-footer">
      <p>Plan suggestions are estimates to support your decision. You choose what to learn.</p>
      {sources.length > 0 && <><strong>Sources</strong><ul>{sources.map(u => <li key={u}><a className="pw-link" href={u} target="_blank" rel="noopener noreferrer">{u}</a></li>)}</ul></>}
    </footer>
  </section>;
}

export function PathwayEmpty(p: PathwayEmptyProps) {
  return <section className="pw pw-empty panel" data-testid="pathway-empty">
    <div className="pw-empty-hero">
      <span className="pw-phase-icon" aria-hidden><Sparkles size={16} /></span>
      <div><div className="eyebrow">No target role yet</div>
        <h2 className="pw-target">Pick where you're heading. We'll map the steps.</h2>
        <p className="muted">Choose a role you want to grow into. Try a sample first if you just want to look around.</p></div>
    </div>
    <fieldset className="pw-presets">
      <legend>1 · Try a sample profile (optional)</legend>
      <p className="muted small">Samples are synthetic and kept separate — they never overwrite your saved profile.</p>
      <div className="pw-preset-grid">{p.presets.map(pr => <label key={pr.id} className={`pw-preset${p.selectedPresetId === pr.id ? ' is-on' : ''}`} data-testid={`card-preset-${pr.id}`}>
        <input type="radio" name="pw-preset" checked={p.selectedPresetId === pr.id} onChange={() => p.onSelectPreset(pr.id)} data-testid={`radio-preset-${pr.id}`} />
        <strong>{pr.label}</strong><span>{pr.description}</span></label>)}</div>
    </fieldset>
    <div className="pw-presets">
      <h3>2 · Choose a target role</h3>
      {!p.selectedPresetId && <p className="muted small">Choose a sample above first, or pick a role in Careers &amp; jobs using your saved skills.</p>}
      {p.error && <div className="match-error" role="alert" data-testid="text-pathway-error">{p.error}</div>}
      {p.loading ? <div className="pw-role-grid">{[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}</div>
        : p.roles.length ? <div className="pw-role-grid">{p.roles.map(r => <button key={r.id} type="button" className="pw-role" disabled={!p.selectedPresetId} onClick={() => p.onBuild(r.id)} data-testid={`button-build-${r.id}`}><Target size={14} /> {r.title}</button>)}</div>
          : <p className="muted">No suggested roles yet.</p>}
      <button type="button" className="text-link" onClick={p.onPickRole} data-testid="button-pick-role">Browse all roles in Careers & jobs →</button>
    </div>
  </section>;
}
