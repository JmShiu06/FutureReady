import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { matchOccupationEvidence, useGetDosmJobMarketInsights, useRefreshDosmJobMarketInsights, getGetDosmJobMarketInsightsQueryKey, useGetAiCapabilities, useRefreshAiCapabilities, getGetAiCapabilitiesQueryKey } from '@workspace/api-client-react';
import { planningScenarios, rankFutureRoles, syntheticPlanningSkills, syntheticSignalSnapshots, type PlanningSignal, type PlanningScenario } from '@workspace/workforce-evidence';
import { useWorkspace } from '@/domain/workspace-context';
import { SectionTitle, useAsync, LoadingBlock, ErrorBlock } from './ui';
import { SdgUseCase } from '@/components/shared/sdg-use-case';
import { officialMilestones, occupationSnapshot, occupationRoadmapTarget } from '@/domain/official-roadmap';
import { learningSchedule } from '@/domain/learning-schedule';
import { capabilityEffects, syntheticCapabilityFacts } from '@workspace/workforce-evidence';
import { BuildRoadmapButton } from '@/components/build-roadmap-button';

export function PlanningPanel() {
  const { profile, planningScenario: scenario, setPlanningScenario: setScenario, isSyntheticDemo, startSyntheticDemo, exitSyntheticDemo, setPlanningEvidence, planningSignalMode: mode, setPlanningSignalMode: setMode, planningAiMode: aiMode, setPlanningAiMode: setAiMode } = useWorkspace();
  const query = useGetDosmJobMarketInsights();
  const ai = useGetAiCapabilities();
  const refreshAi = useRefreshAiCapabilities();
  const refresh = useRefreshDosmJobMarketInsights();
  const client = useQueryClient();
  const skills = mode === 'real' || isSyntheticDemo ? profile.skills.map(s => s.name) : syntheticPlanningSkills;
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
  const effects = capabilityEffects(aiMode === 'real' ? ai.data?.items ?? [] : syntheticCapabilityFacts[aiMode]);
  const rankWithAi = (s: PlanningScenario) => rankFutureRoles(occupations.data?.occupations ?? [], skills, signals, s, effects);
  const rows = rankWithAi(scenario);
  const evidenceKey = JSON.stringify([signals, effects]);
  useEffect(() => { if (mode === 'real' || isSyntheticDemo) setPlanningEvidence(signals, effects); }, [evidenceKey, isSyntheticDemo, mode]);
  const prior = useRef<string>('');
  const [changeSummary, setChangeSummary] = useState('No previous recommendation output in this session.');
  const resultKey = rows.map(r => `${r.role.mycol.title}: ${r.suitability}; first gap ${r.missing[0]?.name ?? 'none'}`).join(' | ');
  useEffect(() => {
    if (!rows.length) return;
    if (prior.current && prior.current !== resultKey) setChangeSummary(`Before: ${prior.current}. After: ${resultKey}. Evidence/scenario changes reorder planning priorities only; no saved completion was removed.`);
    prior.current = resultKey;
  }, [resultKey]);
  const hr = occupations.data?.occupations.find(o => o.id === 'mycol-1212');
  const demoSteps = hr && occupations.data ? officialMilestones({
    skills: syntheticPlanningSkills.map(name => ({ name, level: 1, category: 'Synthetic demo' })),
    startedAt: '2026-10-23', occupation: occupationSnapshot(hr, occupations.data),
  }) : [];
  return <section className="panel panel-pad" style={{ marginBottom: 20 }} data-testid="panel-domain1-planning">
    <SectionTitle title="Future-role planning priorities" note="HUMAN DECISION SUPPORT · NOT A FORECAST" />
    <button type="button" className="btn btn-secondary" data-testid="button-planning-demo" onClick={isSyntheticDemo ? exitSyntheticDemo : startSyntheticDemo}>{isSyntheticDemo ? 'Exit synthetic demo · restore my workspace' : 'Try isolated synthetic demo'}</button>
    {isSyntheticDemo && <p className="disclaimer" role="status">ISOLATED SYNTHETIC WORKSPACE: role choices and roadmap progress here are temporary. Your real saved profile is untouched.</p>}
    <p className="small">Your context: {profile.experienceYears === null ? 'experience not supplied' : `${profile.experienceYears} years (self-reported)`}; interests: {profile.interests.join(', ') || 'not supplied'}; {profile.learningHours ?? 'unknown'} learning hours/week; MYR {profile.budgetMYR ?? 'unknown'} content budget. Experience/interests guide your choice, not a validated qualification score. Set these in My profile.</p>
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <div className="field"><label htmlFor="signal-mode">Signal source</label><select id="signal-mode" className="fr-select" value={mode} onChange={e => setMode(e.target.value as typeof mode)} data-testid="select-signal-mode">
        <option value="real">Official DOSM observations + saved skills</option>
        <option value="a">{syntheticSignalSnapshots.a.label}</option><option value="b">{syntheticSignalSnapshots.b.label}</option>
      </select></div>
      <div className="field"><label htmlFor="ai-signal-mode">AI capability evidence</label><select id="ai-signal-mode" className="fr-select" value={aiMode} onChange={e => setAiMode(e.target.value as typeof aiMode)} data-testid="select-ai-signal"><option value="real">Public OpenAI news feed</option><option value="a" disabled={!isSyntheticDemo}>Synthetic AI A · coding assistance</option><option value="b" disabled={!isSyntheticDemo}>Synthetic AI B · reasoning assistance</option></select></div>
      <div className="field"><label htmlFor="planning-scenario">Assumption scenario</label><select id="planning-scenario" className="fr-select" value={scenario} onChange={e => setScenario(e.target.value as PlanningScenario)} data-testid="select-planning-scenario"><option value="moderate">Moderate AI disruption</option><option value="fast">Fast AI disruption</option></select></div>
      {mode === 'real' && <button className="btn btn-secondary" disabled={refresh.isPending} data-testid="button-refresh-jmi" onClick={() => refresh.mutate(undefined, { onSuccess: data => client.setQueryData(getGetDosmJobMarketInsightsQueryKey(), data) })}>{refresh.isPending ? 'Retrieving official workbook…' : 'Refresh DOSM job-posting signals'}</button>}
    </div>
    <section data-testid="future-skills-radar">
      <h3>Future Skills Radar · 12-month planning horizon</h3>
      <p className="small muted">Source facts are vendor announcement titles/descriptions, not independently verified benchmark gains. Direction means app-estimated relative learning emphasis under tool assistance—not measured demand, job loss or a forecast. Uncertainty: high. Unmapped skills remain unknown. Evidence expires from the 180-day source window.</p>
      {aiMode === 'real' && <><button className="btn btn-secondary btn-small" disabled={refreshAi.isPending} data-testid="button-refresh-ai-feed" onClick={() => refreshAi.mutate(undefined, { onSuccess: data => client.setQueryData(getGetAiCapabilitiesQueryKey(), data) })}>Refresh public AI feed</button><p className="small">{ai.data?.retrievedAt ? `Retrieved ${ai.data.retrievedAt}` : 'No retrieved snapshot yet.'} {ai.data?.warning} {ai.data?.changeSummary}</p></>}
      {aiMode !== 'real' && <p className="disclaimer">SYNTHETIC AI {aiMode.toUpperCase()} fixture, not a public announcement. Change only this selector to isolate the AI evidence effect.</p>}
      {!effects.length && <p className="small">Insufficient validated AI evidence. Skill direction unknown; no AI adjustment applied.</p>}
      <p className="small">Unknown direction for selected skills without a reviewed mapping: {skills.filter(s => !effects.some(e => e.skill.toLowerCase() === s.toLowerCase())).join(', ') || 'none'}. Unknown is not a declining-demand claim.</p>
      <ul>{effects.map(e => <li key={e.skill} className="small"><b>{e.skill}: {e.weight > 0 ? 'Rising relative learning emphasis' : e.weight < 0 ? 'Declining routine-task emphasis' : 'Stable'}</b> · bounded weight {e.weight}; Moderate ×0.5, Fast ×1. {e.reasoning}
        <details><summary>Source facts and dates</summary>{e.evidence.map(f => <p key={f.url}>{f.title} · published {f.publishedOn} · {aiMode === 'real' ? <a className="text-link" href={f.url} target="_blank" rel="noreferrer" data-testid={`radar-evidence-${e.skill}-${f.publishedOn}`}>First-party source</a> : 'Synthetic fixture; no real source claim'}</p>)}</details></li>)}</ul>
      <p className="small">Stable: mapped evidence with zero selected effect. Unknown: skills without an explicit mapping. Repeated news cannot multiply weights. Role adjustment = mean of mapped documented-skill weights (zero for unmapped skills), scaled by scenario; individual gap priorities receive the same bounded skill adjustment.</p>
      <details data-testid="recommendation-change-summary"><summary>Review recommendation changes</summary><p className="small">{changeSummary}</p></details>
    </section>
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
        <p className="small" data-testid={`planning-score-${r.role.id}`}>Overlap {r.overlap}% · signal index {r.signalIndex} · trend index {r.trendIndex} ({r.change === null ? 'change unavailable' : `${(r.change * 100).toFixed(1)}% quarter-on-quarter`}) · baseline {r.baseline} · total adjustment {r.adjustment > 0 ? '+' : ''}{r.adjustment} (AI feed component {r.aiAdjustment.toFixed(2)}) · <b>scenario suitability {r.suitability}/100</b></p>
        <p className="small">Broad group: {r.signal?.group} · {r.signal?.previous} → {r.signal?.latest} online offerings · {r.signal?.period}. {r.signal?.sourceUrl && <a className="text-link" href={r.signal.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-role-signal-${r.role.id}`}>Source workbook</a>}</p>
        <details><summary>Task assumptions and full gaps</summary><p className="small">Assumed routine share {r.task?.routine}; assumed adaptation relevance {r.task?.adaptation}. {r.task?.rationale} These are inspectable workshop inputs, not measured task exposure.</p><p className="small">Matched: {r.matched.join(', ') || 'none'}. Missing by name (not lack of ability): {r.missing.map(s => s.name).join(', ') || 'none'}.</p></details>
        <a className="text-link small" href={r.role.onet.url} target="_blank" rel="noreferrer" data-testid={`link-planning-role-${r.role.id}`}>O*NET skill evidence</a>
        <SdgUseCase roleId={r.role.id} />
        <details><summary>All learning priorities and skill-specific SDG applications under {scenario}</summary>{r.missing.map(s => <div key={s.name}><p className="small">{s.name}: priority {s.priority}; O*NET importance {s.importance}/5; AI evidence contribution {s.aiAdjustment}.</p><SdgUseCase roleId={r.role.id} skill={s.name} /></div>)}</details>
        {(mode === 'real' || isSyntheticDemo) && <BuildRoadmapButton {...occupationRoadmapTarget(occupations.data!.occupations.find(o => o.id === r.role.id)!, occupations.data!)} testId={`button-build-planning-${r.role.id}`} />}
        {mode !== 'real' && !isSyntheticDemo && <p className="small">Start the isolated synthetic demo to build a roadmap from synthetic signals without touching your real profile.</p>}
      </article>)}</div>
      <details className="card-more" open={mode !== 'real'}><summary>Moderate versus Fast: same profile and signal snapshot</summary>
        <div className="grid-2">{(['moderate', 'fast'] as const).map(s => <div key={s}><h3>{planningScenarios[s].label}</h3><ol>{rankWithAi(s).slice(0, 3).map(r => <li key={r.role.id} className="small">{r.role.mycol.title} · {r.suitability}. Learning sequence: {r.missing.slice(0, 3).map(g => g.name).join(' → ')}. See the role’s source/SDG evidence above.</li>)}</ol></div>)}</div>
      </details>
      <details className="card-more" data-testid="demo-hr-pathway"><summary>Complete fictional HR pathway · 5 hours/week · MYR 0 content budget</summary>
        <p className="small">Read-only demo, not saved progress. Four fictional starting skills are held constant. Other gaps receive verified learning content or explicitly app-authored practice. No course completion or qualification is inferred.</p>
        <ol>{demoSteps.map(m => <li key={m.id} className="small"><b>{m.skill}</b>: {m.title} · {m.durationHours}h · {m.timeBasis} · {m.provider} · reviewed {m.reviewedAt}.<p>{m.activity} {m.coverage} {m.costCaveat} Prerequisites: {m.prerequisites.join('; ')}</p>{m.verifiedUrl && <a className="text-link" href={m.verifiedUrl} target="_blank" rel="noreferrer" data-testid={`link-demo-resource-${m.id}`}>Verified resource</a>}<SdgUseCase roleId="mycol-1212" skill={m.skill} /></li>)}</ol>
        <h3>Weekly schedule</h3>{learningSchedule(demoSteps, 5).map(w => <p key={w.week} className="small">Week {w.week}: {w.activities.map(a => `${a.skill} ${a.hours.toFixed(1)}h`).join('; ')}</p>)}
      </details>
    </>}
  </section>;
}
