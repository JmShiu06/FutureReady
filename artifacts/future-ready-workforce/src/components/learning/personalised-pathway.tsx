import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { matchOccupationEvidence, useGetDosmJobMarketInsights } from '@workspace/api-client-react';
import type { PlanningSignal } from '@workspace/workforce-evidence';
import { useWorkspace } from '@/domain/workspace-context';
import { activeBaseline, roadmapMilestones } from '@/domain/learning';
import { occupationSnapshot } from '@/domain/official-roadmap';
import { completionKey } from '@/domain/services';
import { demoRoles } from '@/domain/demo-data';
import { pathwaySamples, sampleStartingSkills } from '@/domain/pathway-samples';
import { buildPathway, describePlanChanges, priorityFingerprint, type PathwayStep } from '@/domain/reskilling-pathway';
import { readPathwayPreferences } from '@/domain/pathway-preferences';
import { usePlanningScenario } from '@/hooks/use-planning-scenario';
import { useAsync, LoadingBlock } from '@/components/workspace/ui';
import { PathwayEmpty, PathwayView } from './pathway-view';
import type { RoadmapBaseline } from '@/domain/types';

export function PersonalisedPathway() {
  const { state, startSampleRoadmap } = useWorkspace();
  const [, navigate] = useLocation();
  const [presetId, setPresetId] = useState<string | null>(null);
  const [buildError, setBuildError] = useState('');
  const baseline = activeBaseline(state);
  // This existing endpoint matches synthetic skill names only; no CV, name, or generation request.
  const occupations = useAsync(signal => matchOccupationEvidence({ skills: sampleStartingSkills(presetId ?? '').map(s => s.name) }, { signal }), presetId ?? '');
  const market = useGetDosmJobMarketInsights();
  const signals = useMemo<PlanningSignal[]>(() => market.data?.occupationGroups
    .filter(g => ['Managers', 'Professionals'].includes(g.label) && g.observations.length)
    .map(g => ({
      group: g.label === 'Managers' ? 'managers' : 'professionals',
      previous: g.observations[0].jobOfferings, latest: g.observations.at(-1)!.jobOfferings,
      sourceUrl: g.observations.at(-1)!.dataUrl, period: g.observations.map(o => o.quarter).join(' → '),
    })) ?? [], [market.data]);
  if (!baseline) return <PathwayEmpty presets={pathwaySamples} selectedPresetId={presetId}
    onSelectPreset={id => { setPresetId(id); setBuildError(''); }}
    roles={(occupations.data?.occupations ?? []).filter(o => o.recommendationStatus === 'eligible' && o.mapping.status === 'verified' && o.documentedSkills.length).map(o => ({ id: o.id, title: o.mycol.title }))}
    onBuild={id => {
      const o = occupations.data?.occupations.find(o => o.id === id);
      if (!o || !occupations.data || !presetId) return;
      try { startSampleRoadmap(occupationSnapshot(o, occupations.data), presetId); }
      catch (error) { setBuildError(error instanceof Error ? error.message : 'This role cannot be built yet.'); }
    }} loading={occupations.status === 'loading'} error={buildError || occupations.error || ''}
    onPickRole={() => navigate('/careers-and-jobs?tab=career-paths')} />;
  if (market.isLoading && !market.data) return <div aria-label="Preparing your pathway with the current market snapshot"><LoadingBlock /></div>;
  return <ActivePathway key={`${state.audience}:${state.targets[state.audience]}:${baseline.startedAt}`} baseline={baseline}
    signals={signals} marketWarning={market.isError ? 'Market data is unavailable. The plan uses documented role skills and scenario assumptions; refresh Market & AI impact to retry.' : ''} />;
}

function ActivePathway({ baseline, signals, marketWarning }: { baseline: RoadmapBaseline; signals: PlanningSignal[]; marketWarning: string }) {
  const { state, profile, targetRoleId, setMilestoneComplete, resetActiveRoadmap, storageWarning } = useWorkspace();
  const [, navigate] = useLocation();
  const { scenario, setScenario, scenarioWarning } = usePlanningScenario();
  const key = `frw-pathway-v1:${state.audience}:${targetRoleId}:${baseline.startedAt}`;
  const [loaded] = useState(() => {
    try { return readPathwayPreferences(window.localStorage.getItem(key), scenario, signals, profile.learningHours ?? 5, profile.budgetMYR ?? 0); }
    catch { return { ...readPathwayPreferences(null, scenario, signals), warning: 'Pathway settings cannot be saved in this browser; progress may last only for this session.' }; }
  });
  const [preferences, setPreferences] = useState(loaded.value);
  const [saveWarning, setSaveWarning] = useState(loaded.warning);
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(preferences)); }
    catch { setSaveWarning('Pathway settings could not be saved; keep this page open or print your plan.'); }
  }, [key, preferences]);
  const milestones = useMemo(() => roadmapMilestones(state), [state]);
  const title = baseline.occupation?.title ?? demoRoles.find(r => r.id === targetRoleId)?.title ?? 'Selected role';
  const input = {
    milestones, roleId: targetRoleId, roleTitle: title, occupation: baseline.occupation,
    hoursPerWeek: preferences.hours, budgetMYR: preferences.budget, freeOnly: preferences.freeOnly,
    now: new Date(baseline.startedAt),
  };
  const plan = buildPathway({ ...input, ...preferences.accepted });
  const candidate = buildPathway({ ...input, scenario, signals });
  const fingerprint = priorityFingerprint(candidate);
  const changed = fingerprint !== priorityFingerprint(plan) && fingerprint !== preferences.ignoredFingerprint;
  const changes = changed ? describePlanChanges(plan, candidate) : [];
  const reason = preferences.accepted.scenario !== scenario
    ? `the AI scenario is now ${scenario === 'fast' ? 'Fast' : 'Moderate'}. Your current order and progress are kept until you approve.`
    : 'the DOSM market snapshot changed the gap priorities. Your current order and progress are kept until you approve.';
  const isDone = (step: PathwayStep) => step.milestoneIds.every(id => !!state.completion[completionKey(state.audience, id)]);
  return <PathwayView plan={plan} targetTitle={title} sampleLabel={baseline.sampleLabel}
    hours={preferences.hours} budget={preferences.budget} freeOnly={preferences.freeOnly} scenario={scenario} planScenario={preferences.accepted.scenario}
    onHoursChange={hours => setPreferences(p => ({ ...p, hours }))}
    onBudgetChange={budget => setPreferences(p => ({ ...p, budget }))}
    onFreeOnlyChange={freeOnly => setPreferences(p => ({ ...p, freeOnly }))}
    onScenarioChange={setScenario}
    isDone={isDone} onToggle={(step, done) => step.milestoneIds.forEach(id => setMilestoneComplete(completionKey(state.audience, id), done))}
    onReviewTwin={() => navigate('/my-profile?section=twin')}
    onReset={() => { resetActiveRoadmap(); try { window.localStorage.removeItem(key); } catch { /* Workspace still reports unavailable storage. */ } }}
    pendingChange={changed ? { reason, changes: changes.length ? changes : ['Scenario emphasis changed; existing milestone IDs and completion will be retained.'] } : undefined}
    onAcceptChanges={() => setPreferences(p => ({ ...p, accepted: { scenario, signals }, ignoredFingerprint: undefined }))}
    onKeepPlan={() => setPreferences(p => ({ ...p, ignoredFingerprint: fingerprint }))}
    storageWarning={[storageWarning, saveWarning, scenarioWarning, marketWarning].filter(Boolean).join(' ')} />;
}
