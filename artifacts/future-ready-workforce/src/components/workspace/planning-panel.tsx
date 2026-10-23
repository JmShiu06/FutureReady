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


type Row = ReturnType<typeof rankFutureRoles>[number];
const fitOf = (n: number) => n >= 70 ? { k: 'strong', label: 'Strong fit' } : n >= 40 ? { k: 'possible', label: 'Possible fit' } : { k: 'stretch', label: 'Stretch' };
function relTime(iso?: string | null) {
  if (!iso) return null; const t = Date.parse(iso); if (Number.isNaN(t)) return iso;
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 48) return `${h} h ago`; return `${Math.round(h / 24)} days ago`;
}
function reasonFor(r: Row) {
  const match = r.overlap > 0 ? 'Some documented skills match' : 'Your skills are not matched yet';
  return `${match}; ${r.signalIndex >= 70 ? 'relatively more' : 'relatively fewer'} broad-group job ads ${r.signalIndex >= 70 ? 'support' : 'limit'} this rank.`;
}
function EvidenceTable({ rows }: { rows: [string, ReactNode][] }) {
  return <table className="pl-evidence-table"><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table>;
}
function RoleCard({ r, i, scenario }: { r: Row; i: number; scenario: PlanningScenario }) {
  const [open, setOpen] = useState(false);
  const fit = fitOf(r.suitability); const pid = `pl-ev-${r.role.id}`;
  const TrendIcon = r.change === null ? Minus : r.change >= 0 ? TrendingUp : TrendingDown;
  return <article className="pl-card" data-testid={`planning-role-${r.role.id}`}>
    <div className="pl-card-head"><span className="pl-rank" aria-label={`Rank ${i + 1}`}>#{i + 1}</span><h3>{r.role.mycol.title}</h3></div>
    <div className="pl-score">
      <div className="pl-score-top"><span className="pl-score-num" data-testid={`planning-score-${r.role.id}`}>{r.suitability}<small>/100 suitability</small></span>
        <span className={`pl-fit ${fit.k}`}>{fit.k === 'strong' ? <CheckCircle2 size={13} aria-hidden="true" /> : fit.k === 'possible' ? <AlertTriangle size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}{fit.label}</span></div>
      <div className={`pl-bar ${fit.k}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.suitability} aria-label={`Suitability ${r.suitability} of 100, ${fit.label}`}><i style={{ transform: `scaleX(${r.suitability / 100})` }} /></div>
    </div>
    <div className="pl-chips">
      <span className={`pl-chip ${r.overlap > 0 ? 'pos' : 'caution'}`}>{r.overlap > 0 ? <><CheckCircle2 size={13} aria-hidden="true" />Your skill match <span>{r.overlap}%</span></> : <><AlertTriangle size={13} aria-hidden="true" />Skills not matched yet</>}</span>
      <span className={`pl-chip ${r.change === null ? '' : r.change >= 0 ? 'pos' : 'caution'}`}><TrendIcon size={13} aria-hidden="true" />Job ads trend <span>{r.change === null ? 'unavailable' : `${r.change >= 0 ? 'up' : 'down'} ${Math.abs(r.change * 100).toFixed(1)}% vs last quarter (broad group)`}</span></span>
      <span className={`pl-chip ${r.adjustment > 0 ? 'pos' : r.adjustment < 0 ? 'caution' : ''}`}><Cpu size={13} aria-hidden="true" />AI impact <span>{r.adjustment > 0 ? '+' : ''}{r.adjustment} {r.adjustment > 0 ? 'boost' : r.adjustment < 0 ? 'pressure' : 'neutral'}</span></span>
    </div>
    <p className="pl-reason" title={reasonFor(r)}>{reasonFor(r)}</p>
    {!!r.missing.length && <div className="pl-gaps"><span className="pl-gaps-label">Top skills to build</span><div className="pl-chips">{r.missing.slice(0, 3).map(s => <span key={s.name} className="pl-gap">{s.name}</span>)}</div></div>}
    <button type="button" className="pl-evidence-btn" aria-expanded={open} aria-controls={pid} onClick={() => setOpen(o => !o)} data-testid={`button-evidence-${r.role.id}`}>{open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}{open ? 'Hide evidence' : 'View evidence'}</button>
    <div id={pid} className="pl-evidence" hidden={!open}>
      <details><summary>Market data</summary>
        <EvidenceTable rows={[
          ['Broad group', r.signal?.group ?? 'Unavailable'],
          ['Online offerings', `${r.signal?.previous.toLocaleString('en-MY') ?? '—'} → ${r.signal?.latest.toLocaleString('en-MY') ?? '—'}`],
          ['Periods', r.signal?.period ?? 'Unavailable'],
          ['Signal index', r.signalIndex], ['Trend index', r.trendIndex], ['Planning baseline', r.baseline],
          ['Scope', 'Group-wide observations, not individual-role demand'],
        ]} />
        {r.signal?.sourceUrl && <a className="text-link" href={r.signal.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-role-signal-${r.role.id}`}>Source workbook</a>}
      </details>
      <details><summary>Skill evidence (O*NET)</summary>
        <p className="small"><a className="text-link" href={r.role.onet.url} target="_blank" rel="noreferrer" data-testid={`link-planning-role-${r.role.id}`}>O*NET skill evidence</a> · US skill reference, not Malaysian demand.</p>
        {r.missing.slice(0, 3).map(s => <div key={s.name}><p className="small">{s.name}: priority {s.priority}; O*NET importance {s.importance}/5 (under {scenario}).</p><SdgUseCase roleId={r.role.id} skill={s.name} /></div>)}
      </details>
      <details><summary>Task assumptions and all skills</summary>
        <EvidenceTable rows={[
          ['Assumed routine share', r.task?.routine ?? 'Unavailable'],
          ['Assumed adaptation relevance', r.task?.adaptation ?? 'Unavailable'],
          ['Rationale', r.task?.rationale ?? 'No task assumptions'],
          ['Evidence status', 'Authored workshop inputs, not measured task exposure'],
          ['Matched names', r.matched.join(', ') || 'None'],
          ['Missing names', r.missing.map(s => s.name).join(', ') || 'None'],
        ]} />
        <p className="small">A missing name does not establish lack of ability.</p>
      </details>
      <details><summary>SDG role use case</summary><SdgUseCase roleId={r.role.id} /></details>
      <details><summary>How score calculated</summary><ul>
        <li>Baseline = 0.55 × overlap + 0.30 × signal index + 0.15 × trend index = {r.baseline}.</li>
        <li>Scenario adjustment {r.adjustment > 0 ? '+' : ''}{r.adjustment} from authored adaptation/automation weights.</li>
        <li>Suitability clamped to 0–100 = {r.suitability}. Not a hiring probability or forecast.</li></ul></details>
    </div>
  </article>;
}

export function PlanningPanel() {
  const { profile } = useWorkspace();
  const [mode, setMode] = useState<'real' | 'a' | 'b'>('real');
  const [scenario, setScenario] = useState<PlanningScenario>('moderate');
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
  const rank = (s: PlanningScenario) => rankFutureRoles(occupations.data?.occupations ?? [], skills, signals, s);
  const rows = rank(scenario);
  const hr = occupations.data?.occupations.find(o => o.id === 'mycol-1212');
  const demoSteps = hr && occupations.data ? officialMilestones({
    skills: syntheticPlanningSkills.map(name => ({ name, level: 1, category: 'Synthetic demo' })),
    startedAt: '2026-10-23', occupation: occupationSnapshot(hr, occupations.data),
  }) : [];
  const [showAll, setShowAll] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById('planning-about-slot')); }, []);
  const updated = relTime(query.data?.retrievedAt);
  const about = <details className="panel panel-pad pl-about" data-testid="planning-about-data"><summary>About this data &amp; limitations</summary>
      <p className="small">DOSM broad-group online offerings, not all vacancies or skill growth. Evidence strength: official source, but limited relevance to a specific occupation/skill. National unemployment and static global skill frequencies are not inputs. HUMAN DECISION SUPPORT · NOT A FORECAST.</p>
      <p className="small">Indicators on this page do not establish occupation vacancies or AI causation; not every indicator measures AI’s impact. The national unemployment rate is unemployed people divided by the labour force. The employment-to-population ratio is the share of the working-age population that is employed. Neither is a rate for any individual job.</p>
      <p className="small">Overlap = exact matched documented skill names ÷ documented skills × 100 (unchanged). Signal index = group’s latest offerings ÷ maximum of Managers/Professionals × 100. Trend index = clamp(50 + 50 × quarter-on-quarter fractional change, 0–100); an unavailable/zero prior count uses neutral 50, not inferred growth. Baseline = 0.55 × overlap + 0.30 × signal index + 0.15 × trend index. Scenario suitability = clamp(baseline + adaptation weight × assumed adaptation − automation weight × assumed routine share, 0–100). These weights are authored planning assumptions, not fitted forecasts or hiring probabilities.</p>
      <p className="small">Missing-skill priority = clamp(12 × O*NET importance + 0.2 × (0.7 × signal index + 0.3 × trend index) + scenario bonus, 0–100). Systems/critical thinking/monitoring/programming/problem-solving bonus: Moderate 4, Fast 18. Listening/speaking/writing/negotiation/social perception/instructing: Moderate 8, Fast 5. Other skills: 0. This prioritises learning under assumptions; it does not infer skill-demand growth. Two-quarter posting changes may be seasonal or volatile and are not forecasts.</p>
      <div className="grid-2">{Object.entries(planningScenarios).map(([id, p]) => <p key={id} className="small"><b>{p.label}</b>: adaptation weight {p.adaptationWeight}; automation weight {p.automationWeight}. No probabilities or forecast horizon are asserted.</p>)}</div>
      {query.data && <p className="small"><a className="text-link" href={query.data.sourceUrl} target="_blank" rel="noreferrer" data-testid="link-planning-dosm">DOSM release</a> · {query.data.totalByQuarter.map(o => `${o.quarter}, workbook published ${o.publicationDate}`).join('; ')} · parser/source mapping review {query.data.reviewedAt}.</p>}
      {occupations.data && <p className="small"><a className="text-link" href={occupations.data.sources.mycol.reportUrl} target="_blank" rel="noreferrer" data-testid="link-planning-mycol">TalentCorp MyCOL scope</a> · <a className="text-link" href={occupations.data.sources.onet.databaseUrl} target="_blank" rel="noreferrer" data-testid="link-planning-onet">O*NET {occupations.data.sources.onet.release}</a> · US skill reference, not Malaysian demand.</p>}
      {!!signals.length && occupations.data && <>
      <details className="card-more" open={mode !== 'real'}><summary>Moderate versus Fast: same profile and signal snapshot</summary>
        <div className="grid-2">{(['moderate', 'fast'] as const).map(s => <div key={s}><h3>{planningScenarios[s].label}</h3><ol>{rank(s).slice(0, 3).map(r => <li key={r.role.id} className="small">{r.role.mycol.title} · {r.suitability}. Learning sequence: {r.missing.slice(0, 3).map(g => g.name).join(' → ')}. See the role’s source/SDG evidence in its card.</li>)}</ol></div>)}</div>
      </details>
      <details className="card-more" data-testid="demo-hr-pathway"><summary>Complete fictional HR pathway · 5 hours/week · MYR 0 content budget</summary>
        <p className="small">Read-only demo, not saved progress. Four fictional starting skills are held constant. Other gaps receive verified learning content or explicitly app-authored practice. No course completion or qualification is inferred.</p>
        <ol>{demoSteps.map(m => <li key={m.id} className="small"><b>{m.skill}</b>: {m.title} · {m.durationHours}h · {m.timeBasis} · {m.provider} · reviewed {m.reviewedAt}.<p>{m.activity} {m.coverage} {m.costCaveat} Prerequisites: {m.prerequisites.join('; ')}</p>{m.verifiedUrl && <a className="text-link" href={m.verifiedUrl} target="_blank" rel="noreferrer" data-testid={`link-demo-resource-${m.id}`}>Verified resource</a>}<SdgUseCase roleId="mycol-1212" skill={m.skill} /></li>)}</ol>
        <h3>Weekly schedule</h3>{learningSchedule(demoSteps, 5).map(w => <p key={w.week} className="small">Week {w.week}: {w.activities.map(a => `${a.skill} ${a.hours.toFixed(1)}h`).join('; ')}</p>)}
      </details></>}
    </details>;
  const visible = showAll ? rows : rows.slice(0, 5);
  return <section id="critical-occupations" className="panel panel-pad" style={{ marginBottom: 20 }} data-testid="panel-domain1-planning">
    <div className="section-head"><div><h2>Malaysian critical occupations</h2><p className="pl-sub">Roles ranked by how well they fit you and current job-market signals.</p></div></div>
    <div className="pl-controls">
      <div className="field"><label htmlFor="signal-mode">Signal source</label><select id="signal-mode" className="fr-select" value={mode} onChange={e => setMode(e.target.value as typeof mode)} data-testid="select-signal-mode">
        <option value="real">Official DOSM observations + saved skills</option>
        <option value="a">{syntheticSignalSnapshots.a.label}</option><option value="b">{syntheticSignalSnapshots.b.label}</option>
      </select></div>
      <div className="field" style={{ flex: '0 0 auto' }}><span className="field-label" id="pl-scn-label">AI disruption</span>
        <div className="pl-seg" role="group" aria-labelledby="pl-scn-label" data-testid="select-planning-scenario">
          <button type="button" disabled aria-disabled="true" aria-describedby="pl-low-note" title="Low is not modelled; only Moderate and Fast calculations exist." data-testid="button-scenario-low">Low</button>
          {(['moderate', 'fast'] as const).map(s => <button key={s} type="button" aria-pressed={scenario === s} onClick={() => setScenario(s)} data-testid={`button-scenario-${s}`}>{s === 'moderate' ? 'Moderate' : 'Fast'}</button>)}
        </div>
        <span id="pl-low-note" className="sr-only">Low disruption is not available: the planning model only defines Moderate and Fast scenarios.</span>
      </div>
      {mode === 'real' && <div className="pl-refresh">
        <button type="button" className="pl-btn-link" disabled={refresh.isPending} data-testid="button-refresh-jmi" onClick={() => refresh.mutate(undefined, { onSuccess: data => client.setQueryData(getGetDosmJobMarketInsightsQueryKey(), data) })}><RefreshCw size={13} aria-hidden="true" />{refresh.isPending ? 'Retrieving official workbook…' : 'Refresh data'}</button>
        <span className="small muted" data-testid="text-planning-updated" title={query.data?.retrievedAt ?? undefined}>{updated ? `Updated ${updated}` : 'Bundled snapshot · not refreshed yet'}</span>
      </div>}
    </div>
    {mode !== 'real' ? <p role="status" className="disclaimer" data-testid="notice-synthetic-signals">SYNTHETIC DEMO ONLY. Both snapshots use the same fictional skills: {skills.join(', ')}. Counts are invented demonstration inputs, not Malaysian observations. Your saved profile and roadmap are unchanged.</p>
      : <div className="pl-meta"><span>Official DOSM signals · decision support, not a forecast.</span><details className="pl-info"><summary data-testid="info-planning-dosm"><Info size={13} aria-hidden="true" />About these signals</summary><div className="pl-info-pop" role="note">DOSM broad-group online offerings, not all vacancies or skill growth. Evidence strength: official source, but limited relevance to a specific occupation/skill. {query.data?.warning} {query.data?.retrievedAt && `Retrieved ${query.data.retrievedAt}.`} Refresh replaces the two-quarter posting input and recalculates planning priorities; it does not change O*NET overlap, skills, or saved progress. National unemployment and static global skill frequencies are not inputs.</div></details></div>}
    {refresh.isError && <p role="alert">Refresh failed; previous validated data retained. Retry after one minute.</p>}
    {(occupations.status === 'loading' || (mode === 'real' && query.isPending)) && <LoadingBlock rows={2} />}
    {occupations.status === 'error' && <ErrorBlock message="Occupation evidence unavailable." onRetry={occupations.retry} />}
    {mode === 'real' && query.isError && <ErrorBlock message="DOSM signals unavailable; no synthetic fallback is substituted." onRetry={() => { void query.refetch(); }} />}
    {!!signals.length && occupations.data && <>
      {!skills.length && <p className="small">No saved skills: these are exploration priorities with zero overlap, not personal recommendations. Add skills in My profile or choose the synthetic demo.</p>}
      <div className="pl-grid">{visible.map((r, i) => <RoleCard key={r.role.id} r={r} i={i} scenario={scenario} />)}</div>
      {rows.length > 5 && <div className="pl-more"><button type="button" className="btn btn-secondary" aria-expanded={showAll} onClick={() => setShowAll(v => !v)} data-testid="button-show-more-occupations">{showAll ? 'Show fewer occupations' : `Show more occupations (${rows.length - 5})`}</button></div>}
    </>}
    {slot ? createPortal(about, slot) : about}
  </section>;
}
