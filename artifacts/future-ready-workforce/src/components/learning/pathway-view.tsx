import { useState } from 'react';
import { BookOpen, Check, ExternalLink, FlaskConical, Hammer, Layers, Printer, RotateCcw, Sparkles, Target } from 'lucide-react';
import type { PathwayPlan, PathwayStep } from '@/domain/reskilling-pathway';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import '@/styles/pathway.css';
import { PathwayContribution } from './pathway-contribution';
import { pathwayProgress } from '@/domain/pathway-progress';
import { useI18n } from '@/i18n/i18n-context';

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
  onPickRole: () => void;
};

const PHASES: { key: Phase; cls: string; Icon: typeof Layers }[] = [
  { key: 'Foundation', cls: 'pw-ph-foundation', Icon: Layers },
  { key: 'Core skills', cls: 'pw-ph-core', Icon: Target },
  { key: 'Apply it', cls: 'pw-ph-apply', Icon: Hammer },
];

const myr = (n: number) => `MYR ${n.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`;
const safeUrl = (u: string | null | undefined) => (u && /^https:\/\//i.test(u) ? u : null);

function Sdgs({ ids, testid }: { ids: number[]; testid: string }) {
  const { t } = useI18n();
  if (!ids.length) return null;
  return <ul className="pw-sdgs" aria-label={t('rm.sdgAria')} title={t('rm.sdgTitle')} data-testid={testid}>
    {ids.map(n => <li key={n} className="pw-sdg">SDG {n}</li>)}
  </ul>;
}

function ResourceBlock({ step }: { step: PathwayStep }) {
  const r = step.resource;
  if (step.kind === 'project') {
    return <div className="pw-resource pw-project" data-testid={`text-project-${step.id}`}>
      <span className="pw-tag">Portfolio project · written by FutureReady</span>
      <div className="pw-chips"><span className="pw-chip">MYR 0</span><span className="pw-chip">{step.hours} hrs · app estimate</span></div>
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
      <span className="pw-chip">{step.hours != null ? `${step.hours} hrs` : 'Duration not stated'}</span>
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
      {!!step.sdgTargets?.length && <><dt>Why this SDG?</dt><dd>{step.sdgTargets.map(t => <p key={t.target}>
        <a href={t.sourceUrl} target="_blank" rel="noreferrer">SDG target {t.target}</a>: {t.reason}
        {t.dutyUrl && <> · <a href={t.dutyUrl} target="_blank" rel="noreferrer">Duty evidence</a></>} · reviewed {t.reviewedOn}.
      </p>)}</dd></>}
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
  const { t } = useI18n();
  const checkbox = <label className="pw-done" data-testid={`label-done-${step.id}`}>
    <input type="checkbox" checked={done} onChange={e => onToggle(e.target.checked)} data-testid={`checkbox-done-${step.id}`} />
    <span>{done ? t('rm.done') : t('rm.markDone')}</span>
  </label>;
  const body = <div className="pw-body">
    {!done && step.startWeek !== undefined && <p className="small"><b>{t('rm.week', { range: `${step.startWeek}${step.endWeek !== step.startWeek ? `–${step.endWeek}` : ''}` })}</b> · {t('rm.weekLine', { date: step.endDate ?? '' })}</p>}
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
          <span className="pw-kind"><Icon size={12} /> {step.kind === 'project' ? t('rm.project') : t('rm.course')} · {t('rm.step', { n: index })}</span>
          <h3 data-testid={`text-step-skill-${step.id}`}>{step.skill}</h3>
        </div>
        {checkbox}
      </header>
      {done ? <details className="pw-collapsed"><summary>{t('rm.completedShow')}</summary>{body}</details> : body}
    </article>
  </li>;
}

export function PathwayView(p: PathwayViewProps) {
  const { plan } = p;
  const [reviewOpen, setReviewOpen] = useState(false);
  const { t } = useI18n();
  const { done: doneCount, total, percent: pct } = pathwayProgress(plan, p.isDone);
  const sources = Array.from(new Set(plan.steps.map(s => s.resource && safeUrl(s.resource.url)).filter((u): u is string => !!u)));
  const printPlan = () => {
    const collapsed = [...document.querySelectorAll<HTMLDetailsElement>('.pw-collapsed:not([open])')];
    collapsed.forEach(d => { d.open = true; });
    window.addEventListener('afterprint', () => collapsed.forEach(d => { d.open = false; }), { once: true });
    window.print();
  };

  return <section className="pw" data-testid="pathway-view">
    {p.sampleLabel && <div className="pw-sample" data-testid="text-sample-label"><FlaskConical size={14} /> {t('rm.sample', { label: p.sampleLabel })}</div>}
    {p.storageWarning && <div className="banner banner-warn pw-noprint" data-testid="text-storage-warning">{p.storageWarning}</div>}

    {p.pendingChange && <div className="pw-pending pw-noprint" role="status" data-testid="banner-pending-change">
      <div><strong>{t('rm.changedBecause', { reason: p.pendingChange.reason })}</strong>
        <button type="button" className="text-link" aria-expanded={reviewOpen} onClick={() => setReviewOpen(o => !o)} data-testid="button-review-changes">{reviewOpen ? t('rm.hideChanges') : t('rm.reviewChanges')}</button></div>
      {reviewOpen && <>
        <ul className="pw-change-list" data-testid="list-pending-changes">{p.pendingChange.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
        <div className="row">
          <button type="button" className="btn btn-primary btn-small" onClick={p.onAcceptChanges} data-testid="button-apply-updates">{t('rm.apply')}</button>
          <button type="button" className="btn btn-quiet btn-small" onClick={p.onKeepPlan} data-testid="button-keep-order">{t('rm.keep')}</button>
        </div>
      </>}
    </div>}

    <div className="pw-summary panel">
      <div className="pw-summary-top">
        <div>
          <div className="eyebrow">{t('rm.eyebrow')}</div>
          <h2 className="pw-target" data-testid="text-target-title">{p.targetTitle}</h2>
          <p className="pw-time" data-testid="text-plan-time">~{plan.totalWeeks} {plan.unknownDurationCount ? 'known weeks' : 'weeks'} remaining at {p.hours} hrs/week{plan.finishDate ? ` · planned finish around ${plan.finishDate}` : plan.unknownDurationCount ? ` · known activities finish around ${plan.knownFinishDate}; full finish date unknown` : ''}</p>
        </div>
        <div className="row pw-noprint">
          <button type="button" className="btn btn-quiet btn-small" onClick={printPlan} data-testid="button-print-plan"><Printer size={13} /> {t('rm.print')}</button>
          <AlertDialog>
            <AlertDialogTrigger asChild><button type="button" className="btn btn-quiet btn-small" data-testid="button-reset-plan"><RotateCcw size={13} /> {t('rm.reset')}</button></AlertDialogTrigger>
            <AlertDialogContent className="roadmap-reset-dialog">
              <AlertDialogHeader><AlertDialogTitle>{t('rm.resetTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('rm.resetBody')}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel data-testid="button-reset-cancel">{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={p.onReset} data-testid="button-reset-confirm">{t('rm.resetConfirm')}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <dl className="pw-stats">
        <div><dt>{t('rm.remaining')}</dt><dd data-testid="text-total-hours">{t('rm.hrs', { n: plan.remainingHours })}{plan.unknownDurationCount ? <small> {t('rm.unstated', { n: plan.unknownDurationCount })}</small> : null}</dd></div>
        <div><dt>{plan.unavailableCount ? t('rm.knownCost') : t('rm.totalCost')}</dt><dd data-testid="text-total-cost">{myr(plan.totalCostMYR)}{plan.unavailableCount ? <small> {t('rm.costUnknown')}</small> : null}</dd></div>
        <div><dt>{t('rm.steps')}</dt><dd data-testid="text-step-count">{total}{plan.unavailableCount ? <small> {t('rm.withoutResource', { n: plan.unavailableCount })}</small> : null}</dd></div>
        <div><dt>{t('rm.skillsToBuild')}</dt><dd data-testid="text-skill-count">{plan.skills.length}</dd></div>
      </dl>
      {!!plan.sdgs.length && <div className="pw-support"><span>{t('rm.supports')}</span><Sdgs ids={plan.sdgs} testid="list-plan-sdgs" /></div>}
      <PathwayContribution plan={plan} />
      <div className="pw-progress" data-testid="text-progress">
        <div className="spread"><span>{t('rm.progress', { done: doneCount, total })}</span><b>{pct}%</b></div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('rm.progressAria')}><i style={{ width: '100%', transform: `scaleX(${pct / 100})` }} /></div>
      </div>
      <div className="pw-controls pw-noprint">
        <div className="field"><label htmlFor="pw-hours">{t('rm.hours', { n: p.hours })}</label>
          <input id="pw-hours" type="range" min={1} max={40} value={p.hours} onChange={e => p.onHoursChange(Number(e.target.value))} data-testid="input-hours" /></div>
        <div className="field"><label htmlFor="pw-budget">{t('rm.budget')}</label>
          <input id="pw-budget" className="fr-input" type="number" min={0} max={100000} step={50} value={p.budget} onChange={e => p.onBudgetChange(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))} data-testid="input-budget" /></div>
        <div className="field"><label htmlFor="pw-scenario">{t('rm.scenario')}</label>
          <select id="pw-scenario" className="fr-select" value={p.scenario} onChange={e => p.onScenarioChange(e.target.value as 'moderate' | 'fast')} data-testid="select-scenario">
            <option value="moderate">{t('rm.moderate')}</option><option value="fast">{t('rm.fast')}</option></select></div>
        <label className="pw-free" htmlFor="pw-free"><input id="pw-free" type="checkbox" checked={p.freeOnly} onChange={e => p.onFreeOnlyChange(e.target.checked)} data-testid="checkbox-free-only" /> {t('rm.freeOnly')}</label>
      </div>
      {p.planScenario && p.planScenario !== p.scenario && <p className="muted small" data-testid="text-saved-order">{t('rm.savedOrder', { scenario: p.planScenario === 'moderate' ? t('rm.moderateShort') : t('rm.fastShort') })}</p>}
    </div>

    {!total && <div className="panel panel-pad" data-testid="text-no-pathway-gaps">{t('rm.noGaps')}</div>}
    {PHASES.map(ph => {
      const steps = plan.steps.filter(s => s.phase === ph.key && (s.hours !== null || p.isDone(s)));
      if (!steps.length) return null;
      return <section key={ph.key} className={`pw-phase ${ph.cls}`} data-testid={`section-phase-${ph.key.replace(/\s/g, '-').toLowerCase()}`}>
        <header className="pw-phase-head"><span className="pw-phase-icon" aria-hidden><ph.Icon size={15} /></span>
          <div><h2>{t(`rm.phase.${ph.key}`)}</h2><p>{t(`rm.note.${ph.key}`)}</p></div></header>
        <ol className="pw-steps">{steps.map(s => <StepCard key={s.id} step={s} index={plan.steps.indexOf(s) + 1} done={p.isDone(s)} onToggle={d => p.onToggle(s, d)} />)}</ol>
      </section>;
    })}
    {plan.unknownDurationCount > 0 && <section className="pw-phase" data-testid="section-unknown-time"><h2>{t('rm.unknownTitle')}</h2>
      <p className="small muted">{t('rm.unknownBody')}</p>
      <ol className="pw-steps">{plan.steps.filter(s => s.hours === null && !p.isDone(s)).map(s => <StepCard key={s.id} step={s} index={plan.steps.indexOf(s) + 1} done={false} onToggle={d => p.onToggle(s, d)} />)}</ol>
    </section>}
    <p className="small muted">{t('rm.packNote', { hours: plan.totalHours })}</p>

    <div className="pw-twin pw-noprint">
      <p>{t('rm.ticking')}</p>
      <button type="button" className="btn btn-secondary btn-small" onClick={p.onReviewTwin} data-testid="button-review-twin"><FlaskConical size={13} /> {t('rm.twin')}</button>
    </div>

    <footer className="pw-footer" data-testid="text-pathway-footer">
      <p>{t('rm.footer')}</p>
      {sources.length > 0 && <><strong>{t('rm.sources')}</strong><ul>{sources.map(u => <li key={u}><a className="pw-link" href={u} target="_blank" rel="noopener noreferrer">{u}</a></li>)}</ul></>}
    </footer>
  </section>;
}

export function PathwayEmpty(p: PathwayEmptyProps) {
  const { t } = useI18n();
  return <section className="pw pw-empty panel" data-testid="pathway-empty">
    <div className="pw-empty-hero">
      <span className="pw-phase-icon" aria-hidden><Sparkles size={16} /></span>
      <div><div className="eyebrow">{t('rm.emptyEyebrow')}</div>
        <h2 className="pw-target">{t('rm.emptyTitle')}</h2>
        <p className="muted">{t('rm.emptyBody')}</p></div>
    </div>
    <div className="pw-presets">
      <button type="button" className="btn btn-primary" onClick={p.onPickRole} data-testid="button-pick-role">{t('rm.pickRole')}</button>
    </div>
  </section>;
}
