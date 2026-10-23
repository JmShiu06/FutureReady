import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { matchOccupationEvidence, useGetDosmJobMarketInsights, useRefreshDosmJobMarketInsights, getGetDosmJobMarketInsightsQueryKey } from '@workspace/api-client-react';
import { planningScenarios, rankFutureRoles, syntheticPlanningSkills, syntheticSignalSnapshots, type PlanningSignal, type PlanningScenario } from '@workspace/workforce-evidence';
import { useWorkspace } from '@/domain/workspace-context';
import { SectionTitle, useAsync, LoadingBlock, ErrorBlock } from './ui';
import { SdgUseCase } from '@/components/shared/sdg-use-case';
import { officialMilestones, occupationSnapshot } from '@/domain/official-roadmap';
import { learningSchedule } from '@/domain/learning-schedule';

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
  return <section className="panel panel-pad" style={{ marginBottom: 20 }} data-testid="panel-domain1-planning">
    <SectionTitle title="Future-role planning priorities" note="HUMAN DECISION SUPPORT · NOT A FORECAST" />
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <div className="field"><label htmlFor="signal-mode">Signal source</label><select id="signal-mode" className="fr-select" value={mode} onChange={e => setMode(e.target.value as typeof mode)} data-testid="select-signal-mode">
        <option value="real">Official DOSM observations + saved skills</option>
        <option value="a">{syntheticSignalSnapshots.a.label}</option><option value="b">{syntheticSignalSnapshots.b.label}</option>
      </select></div>
      <div className="field"><label htmlFor="planning-scenario">Assumption scenario</label><select id="planning-scenario" className="fr-select" value={scenario} onChange={e => setScenario(e.target.value as PlanningScenario)} data-testid="select-planning-scenario"><option value="moderate">Moderate AI disruption</option><option value="fast">Fast AI disruption</option></select></div>
      {mode === 'real' && <button className="btn btn-secondary" disabled={refresh.isPending} data-testid="button-refresh-jmi" onClick={() => refresh.mutate(undefined, { onSuccess: data => client.setQueryData(getGetDosmJobMarketInsightsQueryKey(), data) })}>{refresh.isPending ? 'Retrieving official workbook…' : 'Refresh DOSM job-posting signals'}</button>}
    </div>
    {mode !== 'real' ? <p role="status" className="disclaimer" data-testid="notice-synthetic-signals">SYNTHETIC DEMO ONLY. Both snapshots use the same fictional skills: {skills.join(', ')}. Counts are invented demonstration inputs, not Malaysian observations. Your saved profile and roadmap are unchanged.</p>
      : <p className="small muted">DOSM broad-group online offerings, not all vacancies or skill growth. Evidence strength: official source, but limited relevance to a specific occupation/skill. {query.data?.warning} {query.data?.retrievedAt && `Retrieved ${query.data.retrievedAt}.`} Refresh replaces the two-quarter posting input and recalculates planning priorities; it does not change O*NET overlap, skills, or saved progress. National unemployment and static global skill frequencies are not inputs.</p>}
    {refresh.isError && <p role="alert">Refresh failed; previous validated data retained. Retry after one minute.</p>}
    {(occupations.status === 'loading' || (mode === 'real' && query.isPending)) && <LoadingBlock rows={2} />}
    {occupations.status === 'error' && <ErrorBlock message="Occupation evidence unavailable." onRetry={occupations.retry} />}
    {mode === 'real' && query.isError && <ErrorBlock message="DOSM signals unavailable; no synthetic fallback is substituted." onRetry={() => { void query.refetch(); }} />}
    <details className="card-more"><summary>Inspect formulas, assumptions and source dates</summary>
      <p className="small">Overlap = exact matched documented skill names ÷ documented skills × 100 (unchanged). Signal index = group’s latest offerings ÷ maximum of Managers/Professionals × 100. Trend index = clamp(50 + 50 × quarter-on-quarter fractional change, 0–100); an unavailable/zero prior count uses neutral 50, not inferred growth. Baseline = 0.55 × overlap + 0.30 × signal index + 0.15 × trend index. Scenario suitability = clamp(baseline + adaptation weight × assumed adaptation − automation weight × assumed routine share, 0–100). These weights are authored planning assumptions, not fitted forecasts or hiring probabilities.</p>
      <p className="small">Missing-skill priority = clamp(12 × O*NET importance + 0.2 × (0.7 × signal index + 0.3 × trend index) + scenario bonus, 0–100). Systems/critical thinking/monitoring/programming/problem-solving bonus: Moderate 4, Fast 18. Listening/speaking/writing/negotiation/social perception/instructing: Moderate 8, Fast 5. Other skills: 0. This prioritises learning under assumptions; it does not infer skill-demand growth. Two-quarter posting changes may be seasonal or volatile and are not forecasts.</p>
      <div className="grid-2">{Object.entries(planningScenarios).map(([id, p]) => <p key={id} className="small"><b>{p.label}</b>: adaptation weight {p.adaptationWeight}; automation weight {p.automationWeight}. No probabilities or forecast horizon are asserted.</p>)}</div>
      {query.data && <p className="small"><a className="text-link" href={query.data.sourceUrl} target="_blank" rel="noreferrer" data-testid="link-planning-dosm">DOSM release</a> · {query.data.totalByQuarter.map(o => `${o.quarter}, workbook published ${o.publicationDate}`).join('; ')} · parser/source mapping review {query.data.reviewedAt}.</p>}
      {occupations.data && <p className="small"><a className="text-link" href={occupations.data.sources.mycol.reportUrl} target="_blank" rel="noreferrer" data-testid="link-planning-mycol">TalentCorp MyCOL scope</a> · <a className="text-link" href={occupations.data.sources.onet.databaseUrl} target="_blank" rel="noreferrer" data-testid="link-planning-onet">O*NET {occupations.data.sources.onet.release}</a> · US skill reference, not Malaysian demand.</p>}
    </details>
    {!!signals.length && occupations.data && <>
      {!skills.length && <p className="small">No saved skills: these are exploration priorities with zero overlap, not personal recommendations. Add skills in My profile or choose the synthetic demo.</p>}
      <div className="grid-2">{rows.map((r, i) => <article className="role-card" key={r.role.id} data-testid={`planning-role-${r.role.id}`}>
        <h3>#{i + 1} {r.role.mycol.title}</h3>
        <p className="small" data-testid={`planning-score-${r.role.id}`}>Overlap {r.overlap}% · signal index {r.signalIndex} · trend index {r.trendIndex} ({r.change === null ? 'change unavailable' : `${(r.change * 100).toFixed(1)}% quarter-on-quarter`}) · baseline {r.baseline} · scenario adjustment {r.adjustment > 0 ? '+' : ''}{r.adjustment} · <b>scenario suitability {r.suitability}/100</b></p>
        <p className="small">Broad group: {r.signal?.group} · {r.signal?.previous} → {r.signal?.latest} online offerings · {r.signal?.period}. {r.signal?.sourceUrl && <a className="text-link" href={r.signal.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-role-signal-${r.role.id}`}>Source workbook</a>}</p>
        <details><summary>Task assumptions and full gaps</summary><p className="small">Assumed routine share {r.task?.routine}; assumed adaptation relevance {r.task?.adaptation}. {r.task?.rationale} These are inspectable workshop inputs, not measured task exposure.</p><p className="small">Matched: {r.matched.join(', ') || 'none'}. Missing by name (not lack of ability): {r.missing.map(s => s.name).join(', ') || 'none'}.</p></details>
        <a className="text-link small" href={r.role.onet.url} target="_blank" rel="noreferrer" data-testid={`link-planning-role-${r.role.id}`}>O*NET skill evidence</a>
        <SdgUseCase roleId={r.role.id} />
        <details><summary>Top learning priorities under {scenario}</summary>{r.missing.slice(0, 3).map(s => <div key={s.name}><p className="small">{s.name}: priority {s.priority}; O*NET importance {s.importance}/5.</p><SdgUseCase roleId={r.role.id} skill={s.name} /></div>)}</details>
      </article>)}</div>
      <details className="card-more" open={mode !== 'real'}><summary>Moderate versus Fast: same profile and signal snapshot</summary>
        <div className="grid-2">{(['moderate', 'fast'] as const).map(s => <div key={s}><h3>{planningScenarios[s].label}</h3><ol>{rank(s).slice(0, 3).map(r => <li key={r.role.id} className="small">{r.role.mycol.title} · {r.suitability}. Learning sequence: {r.missing.slice(0, 3).map(g => g.name).join(' → ')}. See the role’s source/SDG evidence above.</li>)}</ol></div>)}</div>
      </details>
      <details className="card-more" data-testid="demo-hr-pathway"><summary>Complete fictional HR pathway · 5 hours/week · MYR 0 content budget</summary>
        <p className="small">Read-only demo, not saved progress. Four fictional starting skills are held constant. Other gaps receive verified learning content or explicitly app-authored practice. No course completion or qualification is inferred.</p>
        <ol>{demoSteps.map(m => <li key={m.id} className="small"><b>{m.skill}</b>: {m.title} · {m.durationHours}h · {m.timeBasis} · {m.provider} · reviewed {m.reviewedAt}.<p>{m.activity} {m.coverage} {m.costCaveat} Prerequisites: {m.prerequisites.join('; ')}</p>{m.verifiedUrl && <a className="text-link" href={m.verifiedUrl} target="_blank" rel="noreferrer" data-testid={`link-demo-resource-${m.id}`}>Verified resource</a>}<SdgUseCase roleId="mycol-1212" skill={m.skill} /></li>)}</ol>
        <h3>Weekly schedule</h3>{learningSchedule(demoSteps, 5).map(w => <p key={w.week} className="small">Week {w.week}: {w.activities.map(a => `${a.skill} ${a.hours.toFixed(1)}h`).join('; ')}</p>)}
      </details>
    </>}
  </section>;
}
