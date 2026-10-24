import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, Cpu, Info, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import '@/styles/planning.css';
import { useQueryClient } from '@tanstack/react-query';
import { matchOccupationEvidence, useGetDosmJobMarketInsights, useRefreshDosmJobMarketInsights, getGetDosmJobMarketInsightsQueryKey } from '@workspace/api-client-react';
import { planningScenarios, rankFutureRoles, syntheticPlanningSkills, syntheticSignalSnapshots, type PlanningSignal, type PlanningScenario } from '@workspace/workforce-evidence';
import { useWorkspace } from '@/domain/workspace-context';
import { useAsync, LoadingBlock, ErrorBlock } from './ui';
import { SdgUseCase } from '@/components/shared/sdg-use-case';
import { officialMilestones, occupationSnapshot } from '@/domain/official-roadmap';
import { learningSchedule } from '@/domain/learning-schedule';
import { usePlanningScenario } from '@/hooks/use-planning-scenario';
import { useAiResearch } from '@/hooks/use-ai-research';
import { AiResearchEvidence } from '@/components/shared/ai-research-evidence';


type Row = ReturnType<typeof rankFutureRoles>[number];
type Ui = (source: string, vars?: Record<string, string | number>) => string;
const fitOf = (n: number) => n >= 70 ? { k: 'strong', label: 'Strong fit' } : n >= 40 ? { k: 'possible', label: 'Possible fit' } : { k: 'stretch', label: 'Stretch' };
function relTime(iso: string | null | undefined, ui: Ui) {
  if (!iso) return null; const t = Date.parse(iso); if (Number.isNaN(t)) return iso;
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return ui('just now'); if (m < 60) return ui('{count} min ago', { count: m }); const h = Math.round(m / 60); if (h < 48) return ui('{count} h ago', { count: h }); return ui('{count} days ago', { count: Math.round(h / 24) });
}
function reasonFor(r: Row, ui: Ui) {
  const match = ui(r.overlap > 0 ? 'Some documented skills match' : 'Your skills are not matched yet');
  return r.signalIndex >= 70
    ? ui('{match}; relatively more broad-group job ads support this rank.', { match })
    : ui('{match}; relatively fewer broad-group job ads limit this rank.', { match });
}
function EvidenceTable({ rows }: { rows: [string, ReactNode][] }) {
  return <table className="pl-evidence-table"><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table>;
}
function RoleCard({ r, i, scenario }: { r: Row; i: number; scenario: PlanningScenario }) {
  const { ui } = useI18n();
  const [open, setOpen] = useState(false);
  const source = fitOf(r.suitability); const fit = { ...source, label: ui(source.label) }; const pid = `pl-ev-${r.role.id}`;
  const reason = reasonFor(r, ui);
  const TrendIcon = r.change === null ? Minus : r.change >= 0 ? TrendingUp : TrendingDown;
  return <article className="pl-card" data-testid={`planning-role-${r.role.id}`}>
    <div className="pl-card-head"><span className="pl-rank" aria-label={ui('Rank {n}', { n: i + 1 })}>#{i + 1}</span><h3>{r.role.mycol.title}</h3></div>
    <div className="pl-score">
      <div className="pl-score-top"><span className="pl-score-num" data-testid={`planning-score-${r.role.id}`}>{r.suitability}<small>{ui('/100 suitability')}</small></span>
        <span className={`pl-fit ${fit.k}`}>{fit.k === 'strong' ? <CheckCircle2 size={13} aria-hidden="true" /> : fit.k === 'possible' ? <AlertTriangle size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}{fit.label}</span></div>
      <div className={`pl-bar ${fit.k}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.suitability} aria-label={ui('Suitability {score} of 100, {fit}', { score: r.suitability, fit: fit.label })}><i style={{ transform: `scaleX(${r.suitability / 100})` }} /></div>
    </div>
    <div className="pl-chips">
      <span className={`pl-chip ${r.overlap > 0 ? 'pos' : 'caution'}`}>{r.overlap > 0 ? <><CheckCircle2 size={13} aria-hidden="true" />{ui('Your skill match')} <span>{r.overlap}%</span></> : <><AlertTriangle size={13} aria-hidden="true" />{ui('Skills not matched yet')}</>}</span>
      <span className={`pl-chip ${r.change === null ? '' : r.change >= 0 ? 'pos' : 'caution'}`}><TrendIcon size={13} aria-hidden="true" />{ui('Job ads trend')} <span>{r.change === null ? ui('unavailable') : ui(r.change >= 0 ? 'up {percent}% vs last quarter (broad group)' : 'down {percent}% vs last quarter (broad group)', { percent: Math.abs(r.change * 100).toFixed(1) })}</span></span>
      <span className={`pl-chip ${r.adjustment > 0 ? 'pos' : r.adjustment < 0 ? 'caution' : ''}`}><Cpu size={13} aria-hidden="true" />{ui('AI impact')} <span>{r.adjustment > 0 ? '+' : ''}{r.adjustment} {ui(r.adjustment > 0 ? 'boost' : r.adjustment < 0 ? 'pressure' : 'neutral')}</span></span>
    </div>
    <p className="pl-reason" title={reason}>{reason}</p>
    {!!r.missing.length && <div className="pl-gaps"><span className="pl-gaps-label">{ui('Top skills to build')}</span><div className="pl-chips">{r.missing.slice(0, 3).map(s => <span key={s.name} className="pl-gap">{s.name}</span>)}</div></div>}
    <button type="button" className="pl-evidence-btn" aria-expanded={open} aria-controls={pid} onClick={() => setOpen(o => !o)} data-testid={`button-evidence-${r.role.id}`}>{open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}{ui(open ? 'Hide evidence' : 'View evidence')}</button>
    <div id={pid} className="pl-evidence" hidden={!open}>
      <details><summary>{ui('Market data')}</summary>
        <EvidenceTable rows={[
          [ui('Broad group'), r.signal?.group ?? ui('Unavailable')],
          [ui('Online offerings'), `${r.signal?.previous.toLocaleString('en-MY') ?? '—'} → ${r.signal?.latest.toLocaleString('en-MY') ?? '—'}`],
          [ui('Periods'), r.signal?.period ?? ui('Unavailable')],
          [ui('Signal index'), r.signalIndex], [ui('Trend index'), r.trendIndex], [ui('Planning baseline'), r.baseline],
          [ui('Scope'), ui('Group-wide observations, not individual-role demand')],
        ]} />
        {r.signal?.sourceUrl && <a className="text-link" href={r.signal.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-role-signal-${r.role.id}`}>{ui('Source workbook')}</a>}
      </details>
      <details><summary>{ui('Skill evidence (O*NET)')}</summary>
        <p className="small"><a className="text-link" href={r.role.onet.url} target="_blank" rel="noreferrer" data-testid={`link-planning-role-${r.role.id}`}>{ui('O*NET skill evidence')}</a> · {ui('US skill reference, not Malaysian demand.')}</p>
        {r.missing.slice(0, 3).map(s => <div key={s.name}><p className="small">{ui('{skill}: priority {priority}; O*NET importance {importance}/5 (under {scenario}).', { skill: s.name, priority: s.priority, importance: s.importance, scenario: ui(scenario) })}</p><SdgUseCase roleId={r.role.id} skill={s.name} /></div>)}
      </details>
      <details><summary>{ui('Task assumptions and all skills')}</summary>
        <EvidenceTable rows={[
          [ui('Assumed routine share'), r.task?.routine ?? ui('Unavailable')],
          [ui('Assumed adaptation relevance'), r.task?.adaptation ?? ui('Unavailable')],
          [ui('Rationale'), r.task?.rationale ?? ui('No task assumptions')],
          [ui('Evidence status'), ui('Authored workshop inputs, not measured task exposure')],
          [ui('Matched names'), r.matched.join(', ') || ui('None')],
          [ui('Missing names'), r.missing.map(s => s.name).join(', ') || ui('None')],
        ]} />
        <p className="small">{ui('A missing name does not establish lack of ability.')}</p>
      </details>
      <details><summary>{ui('SDG role use case')}</summary><SdgUseCase roleId={r.role.id} /></details>
      <details><summary>{ui('How score calculated')}</summary><ul>
        <li>{ui('Baseline = 0.55 × overlap + 0.30 × signal index + 0.15 × trend index = {value}.', { value: r.baseline })}</li>
        <li>{ui('Scenario adjustment {value} from authored adaptation/automation weights.', { value: `${r.adjustment > 0 ? '+' : ''}${r.adjustment}` })}</li>
        <li>{ui('Suitability clamped to 0–100 = {value}. Not a hiring probability or forecast.', { value: r.suitability })}</li></ul></details>
    </div>
  </article>;
}

import { useI18n } from '@/i18n/i18n-context';

export function PlanningPanel() {
  const { ui, t, locale } = useI18n();
  const { profile } = useWorkspace();
  const [mode, setMode] = useState<'real' | 'a' | 'b'>('real');
  const { scenario, setScenario } = usePlanningScenario();
  const ai = useAiResearch();
  const query = useGetDosmJobMarketInsights();
  const refresh = useRefreshDosmJobMarketInsights();
  const client = useQueryClient();
  const skills = mode === 'real' ? profile.skills.map(s => s.name) : syntheticPlanningSkills;
  const occupations = useAsync(signal => matchOccupationEvidence({ skills: [...skills] }, { signal }), JSON.stringify(skills));
  const signals: PlanningSignal[] = mode === 'real'
    ? (query.data?.occupationGroups.filter(g => ['Managers', 'Professionals'].includes(g.label)).map(g => ({
      group: g.label === 'Managers' ? 'managers' as const : 'professionals' as const,
      previous: g.observations[0].jobOfferings, latest: g.observations.at(-1)!.jobOfferings,
      sourceUrl: g.observations.at(-1)!.dataUrl, period: g.observations.map(o => o.quarter).join(' → '),
    })) ?? [])
    : (['managers', 'professionals'] as const).map(group => ({
      group, previous: syntheticSignalSnapshots[mode][group][0], latest: syntheticSignalSnapshots[mode][group][1],
      sourceUrl: '', period: syntheticSignalSnapshots[mode].label,
    }));
  const rank = (s: PlanningScenario) => rankFutureRoles(occupations.data?.occupations ?? [], skills, signals, s, ai.weights);
  const rows = rank(scenario);
  const hr = occupations.data?.occupations.find(o => o.id === 'mycol-1212');
  const demoSteps = hr && occupations.data ? officialMilestones({
    skills: syntheticPlanningSkills.map(name => ({ name, level: 1, category: 'Synthetic demo' })),
    startedAt: '2026-10-23', occupation: occupationSnapshot(hr, occupations.data),
  }) : [];
  const [showAll, setShowAll] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById('planning-about-slot')); }, []);
  const updated = relTime(query.data?.retrievedAt, ui);
  const about = <details className="panel panel-pad pl-about" data-testid="planning-about-data"><summary>{ui('About this data & limitations')}</summary>
      <p className="small">{ui('DOSM broad-group online offerings, not all vacancies or skill growth. Evidence strength: official source, but limited relevance to a specific occupation/skill.')} {ui('National unemployment and static global skill frequencies are not inputs.')} {ui('HUMAN DECISION SUPPORT · NOT A FORECAST.')}</p>
      <p className="small">{ui('Indicators on this page do not establish occupation vacancies or AI causation; not every indicator measures AI’s impact. The national unemployment rate is unemployed people divided by the labour force. The employment-to-population ratio is the share of the working-age population that is employed. Neither is a rate for any individual job.')}</p>
      <p className="small">{ui('Overlap = exact matched documented skill names ÷ documented skills × 100 (unchanged). Signal index = group’s latest offerings ÷ maximum of Managers/Professionals × 100. Trend index = clamp(50 + 50 × quarter-on-quarter fractional change, 0–100); an unavailable/zero prior count uses neutral 50, not inferred growth. Baseline = 0.55 × overlap + 0.30 × signal index + 0.15 × trend index. Scenario suitability = clamp(baseline + adaptation weight × assumed adaptation − automation weight × assumed routine share, 0–100). These weights are authored planning assumptions, not fitted forecasts or hiring probabilities.')}</p>
      <p className="small">{ui('Missing-skill priority = clamp(12 × O*NET importance + 0.2 × (0.7 × signal index + 0.3 × trend index) + scenario bonus, 0–100). Systems/critical thinking/monitoring/programming/problem-solving bonus: Moderate 4, Fast 18. Listening/speaking/writing/negotiation/social perception/instructing: Moderate 8, Fast 5. Other skills: 0. This prioritises learning under assumptions; it does not infer skill-demand growth. Two-quarter posting changes may be seasonal or volatile and are not forecasts.')}</p>
      <div className="grid-2">{Object.entries(planningScenarios).map(([id, p]) => <p key={id} className="small"><b>{ui(p.label)}</b>: {ui('adaptation weight')} {p.adaptationWeight}; {ui('automation weight')} {p.automationWeight}. {ui('No probabilities or forecast horizon are asserted.')}</p>)}</div>
      {query.data && <p className="small"><a className="text-link" href={query.data.sourceUrl} target="_blank" rel="noreferrer" data-testid="link-planning-dosm">{ui('DOSM release')}</a> · {query.data.totalByQuarter.map(o => ui('{quarter}, workbook published {date}', { quarter: o.quarter, date: o.publicationDate })).join('; ')} · {ui('parser/source mapping review {date}.', { date: query.data.reviewedAt })}</p>}
      {occupations.data && <p className="small"><a className="text-link" href={occupations.data.sources.mycol.reportUrl} target="_blank" rel="noreferrer" data-testid="link-planning-mycol">{ui('TalentCorp MyCOL scope')}</a> · <a className="text-link" href={occupations.data.sources.onet.databaseUrl} target="_blank" rel="noreferrer" data-testid="link-planning-onet">O*NET {occupations.data.sources.onet.release}</a> · {ui('US skill reference, not Malaysian demand.')}</p>}
      {!!signals.length && occupations.data && <>
      <details className="card-more" open={mode !== 'real'}><summary>{ui('Moderate versus Fast: same profile and signal snapshot')}</summary>
        <div className="grid-2">{(['moderate', 'fast'] as const).map(s => <div key={s}><h3>{ui(planningScenarios[s].label)}</h3><ol>{rank(s).slice(0, 3).map(r => <li key={r.role.id} className="small">{ui('{title} · {score}. Learning sequence: {sequence}. See the role’s source/SDG evidence in its card.', { title: r.role.mycol.title, score: r.suitability, sequence: r.missing.slice(0, 3).map(g => g.name).join(' → ') })}</li>)}</ol></div>)}</div>
      </details>
      <details className="card-more" data-testid="demo-hr-pathway"><summary>{ui('Complete fictional HR pathway · 5 hours/week · MYR 0 content budget')}</summary>
        <p className="small">{ui('Read-only demo, not saved progress. Four fictional starting skills are held constant. Other gaps receive verified learning content or explicitly app-authored practice. No course completion or qualification is inferred.')}</p>
        {locale !== 'en' && <p className="small muted">{t('detail.sourceLanguage')}</p>}
        <ol>{demoSteps.map(m => <li key={m.id} className="small"><b>{m.skill}</b>: {ui(m.title)} · {m.durationHours}h · {ui(m.timeBasis ?? '')} · {ui(m.provider)} · {ui('reviewed {date}', { date: m.reviewedAt ?? '' })}.<p>{m.activity} {m.coverage} {m.costCaveat} {ui('Prerequisites:')} {m.prerequisites.join('; ')}</p>{m.verifiedUrl && <a className="text-link" href={m.verifiedUrl} target="_blank" rel="noreferrer" data-testid={`link-demo-resource-${m.id}`}>{ui('Verified resource')}</a>}<SdgUseCase roleId="mycol-1212" skill={m.skill} /></li>)}</ol>
        <h3>{ui('Weekly schedule')}</h3>{learningSchedule(demoSteps, 5).map(w => <p key={w.week} className="small">{ui('Week {week}: {activities}', { week: w.week, activities: w.activities.map(a => `${a.skill} ${a.hours.toFixed(1)}h`).join('; ') })}</p>)}
      </details></>}
    </details>;
  const visible = showAll ? rows : rows.slice(0, 5);
  return <section id="critical-occupations" className="panel panel-pad" style={{ marginBottom: 20 }} data-testid="panel-domain1-planning">
    <div className="section-head"><div><h2>{ui('Malaysian critical occupations')}</h2><p className="pl-sub">{ui('Roles ranked by how well they fit you and current job-market signals.')}</p></div></div>
    <div className="pl-controls">
      <div className="field"><label htmlFor="signal-mode">{ui('Signal source')}</label><select id="signal-mode" className="fr-select" value={mode} onChange={e => setMode(e.target.value as typeof mode)} data-testid="select-signal-mode">
        <option value="real">{ui('Official DOSM observations + saved skills')}</option>
        <option value="a">{ui(syntheticSignalSnapshots.a.label)}</option><option value="b">{ui(syntheticSignalSnapshots.b.label)}</option>
      </select></div>
      <div className="field" style={{ flex: '0 0 auto' }}><span className="field-label" id="pl-scn-label">{ui('AI disruption')}</span>
        <div className="pl-seg" role="group" aria-labelledby="pl-scn-label" data-testid="select-planning-scenario">
          <button type="button" disabled aria-disabled="true" aria-describedby="pl-low-note" title={ui('Low is not modelled; only Moderate and Fast calculations exist.')} data-testid="button-scenario-low">{ui('Low')}</button>
          {(['moderate', 'fast'] as const).map(s => <button key={s} type="button" aria-pressed={scenario === s} onClick={() => setScenario(s)} data-testid={`button-scenario-${s}`}>{ui(s === 'moderate' ? 'Moderate' : 'Fast')}</button>)}
        </div>
        <span id="pl-low-note" className="sr-only">{ui('Low disruption is not available: the planning model only defines Moderate and Fast scenarios.')}</span>
      </div>
      {mode === 'real' && <div className="pl-refresh">
        <button type="button" className="pl-btn-link" disabled={refresh.isPending} data-testid="button-refresh-jmi" onClick={() => refresh.mutate(undefined, { onSuccess: data => client.setQueryData(getGetDosmJobMarketInsightsQueryKey(), data) })}><RefreshCw size={13} aria-hidden="true" />{ui(refresh.isPending ? 'Retrieving official workbook…' : 'Refresh data')}</button>
        <span className="small muted" data-testid="text-planning-updated" title={query.data?.retrievedAt ?? undefined}>{updated ? ui('Updated {time}', { time: updated }) : ui('Bundled snapshot · not refreshed yet')}</span>
      </div>}
    </div>
    <div className="pl-controls">
      <label className="field">{ui('AI evidence source')}<select className="fr-select" value={ai.demo ? 'demo' : 'real'} onChange={e => ai.setDemo(e.target.value === 'demo')}>
        <option value="real">{ui('Real source: arXiv research activity')}</option><option value="demo">{ui('Demo: simulate a fast AI jump')}</option>
      </select></label>
      <button className="btn btn-secondary btn-small" disabled={ai.busy} onClick={ai.refresh}>{ui(ai.busy ? 'Fetching arXiv counts…' : 'Refresh AI signals')}</button>
    </div>
    {ai.demo && <p className="disclaimer">{ui('Synthetic AI A · Demo: simulate a fast AI jump. Authored weights only; not observed research or a forecast. Does not change saved progress.')}</p>}
    <AiResearchEvidence />
    {mode !== 'real' ? <p role="status" className="disclaimer" data-testid="notice-synthetic-signals">{ui('SYNTHETIC DEMO ONLY. Both snapshots use the same fictional skills: {skills}. Counts are invented demonstration inputs, not Malaysian observations. Your saved profile and roadmap are unchanged.', { skills: skills.join(', ') })}</p>
      : <div className="pl-meta"><span>{ui('Official DOSM signals · decision support, not a forecast.')}</span><details className="pl-info"><summary data-testid="info-planning-dosm"><Info size={13} aria-hidden="true" />{ui('About these signals')}</summary><div className="pl-info-pop" role="note">{ui('DOSM broad-group online offerings, not all vacancies or skill growth. Evidence strength: official source, but limited relevance to a specific occupation/skill.')} {query.data?.warning ? ui(query.data.warning) : null} {query.data?.retrievedAt && ui('Retrieved {date}.', { date: query.data.retrievedAt })} {ui('Refresh replaces the two-quarter posting input and recalculates planning priorities; it does not change O*NET overlap, skills, or saved progress.')} {ui('National unemployment and static global skill frequencies are not inputs.')}</div></details></div>}
    {refresh.isError && <p role="alert">{ui('Refresh failed; previous validated data retained. Retry after one minute.')}</p>}
    {(occupations.status === 'loading' || (mode === 'real' && query.isPending)) && <LoadingBlock rows={2} />}
    {occupations.status === 'error' && <ErrorBlock message={ui('Occupation evidence unavailable.')} onRetry={occupations.retry} />}
    {mode === 'real' && query.isError && <ErrorBlock message={ui('DOSM signals unavailable; no synthetic fallback is substituted.')} onRetry={() => { void query.refetch(); }} />}
    {!!signals.length && occupations.data && <>
      {!skills.length && <p className="small">{ui('No saved skills: these are exploration priorities with zero overlap, not personal recommendations. Add skills in My profile or choose the synthetic demo.')}</p>}
      <div className="pl-grid">{visible.map((r, i) => <RoleCard key={r.role.id} r={r} i={i} scenario={scenario} />)}</div>
      {rows.length > 5 && <div className="pl-more"><button type="button" className="btn btn-secondary" aria-expanded={showAll} onClick={() => setShowAll(v => !v)} data-testid="button-show-more-occupations">{showAll ? ui('Show fewer occupations') : ui('Show more occupations ({count})', { count: rows.length - 5 })}</button></div>}
    </>}
    {slot ? createPortal(about, slot) : about}
  </section>;
}
