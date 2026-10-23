import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useGetDosmJobMarketInsights } from '@workspace/api-client-react';
import type { PlanningSignal } from '@workspace/workforce-evidence';
import { useWorkspace } from '@/domain/workspace-context';
import { activeBaseline, roadmapMilestones } from '@/domain/learning';
import { completionKey } from '@/domain/services';
import { demoRoles } from '@/domain/demo-data';
import { pathwaySamples } from '@/domain/pathway-samples';
import { buildPathway, describePlanChanges, priorityFingerprint, type PathwayStep } from '@/domain/reskilling-pathway';
import { readPathwayPreferences } from '@/domain/pathway-preferences';
import { usePlanningScenario } from '@/hooks/use-planning-scenario';
import { LoadingBlock } from '@/components/workspace/ui';
import { PathwayEmpty, PathwayView } from './pathway-view';
import type { RoadmapBaseline } from '@/domain/types';
import { malaysianCatalogReference } from '@/domain/resource-catalog';
import { useAiResearch } from '@/hooks/use-ai-research';
import { AiResearchEvidence } from '@/components/shared/ai-research-evidence';
import { resolveActivePathway, stepIsDone } from '@/domain/pathway-progress';
import { PATHWAY_SETTINGS_EVENT } from '@/hooks/use-pathway-progress';
import { useI18n } from '@/i18n/i18n-context';

export function PersonalisedPathway() {
  const { state } = useWorkspace();
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const baseline = activeBaseline(state);
  const market = useGetDosmJobMarketInsights();
  const signals = useMemo<PlanningSignal[]>(() => market.data?.occupationGroups
    .filter(g => ['Managers', 'Professionals'].includes(g.label) && g.observations.length)
    .map(g => ({
      group: g.label === 'Managers' ? 'managers' : 'professionals',
      previous: g.observations[0].jobOfferings, latest: g.observations.at(-1)!.jobOfferings,
      sourceUrl: g.observations.at(-1)!.dataUrl, period: g.observations.map(o => o.quarter).join(' → '),
    })) ?? [], [market.data]);
  if (!baseline) return <PathwayEmpty onPickRole={() => navigate('/careers-and-jobs?tab=career-paths')} />;
  if (market.isLoading && !market.data) return <div aria-label={t('learn.preparing')}><LoadingBlock /></div>;
  return <><ActivePathway key={`${state.audience}:${state.targets[state.audience]}:${baseline.startedAt}`} baseline={baseline}
    signals={signals} marketWarning={market.isError ? t('learn.marketWarning') : ''} />
    <aside className="disclaimer"><a href={malaysianCatalogReference.url} target="_blank" rel="noreferrer">{malaysianCatalogReference.title}</a> · {malaysianCatalogReference.status}. {malaysianCatalogReference.note}</aside></>;
}

function ActivePathway({ baseline, signals, marketWarning }: { baseline: RoadmapBaseline; signals: PlanningSignal[]; marketWarning: string }) {
  const { state, profile, targetRoleId, setMilestoneComplete, resetActiveRoadmap, storageWarning } = useWorkspace();
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const { scenario, setScenario, scenarioWarning } = usePlanningScenario();
  const ai = useAiResearch();
  const key = `frw-pathway-v1:${state.audience}:${targetRoleId}:${baseline.startedAt}`;
  const sample = pathwaySamples.find(s => s.label === baseline.sampleLabel);
  const [loaded] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      const initial = readPathwayPreferences(raw, scenario, signals, sample?.hours ?? profile.learningHours ?? 5, sample?.budget ?? profile.budgetMYR ?? 0);
      if (!raw) initial.value.accepted = { scenario, signals, researchWeights: ai.weights,
        researchFetchedAt: ai.data?.snapshot?.fetchedAt, researchSource: ai.demo ? 'demo' : ai.data?.snapshot ? 'arxiv' : 'unavailable' };
      return initial;
    }
    catch { return { ...readPathwayPreferences(null, scenario, signals), warning: t('rm.settingsUnsaved') }; }
  });
  const [preferences, setPreferences] = useState(loaded.value);
  const [saveWarning, setSaveWarning] = useState(loaded.warning);
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(preferences)); window.dispatchEvent(new Event(PATHWAY_SETTINGS_EVENT)); }
    catch { setSaveWarning(t('rm.settingsFailed')); }
  }, [key, preferences]);
  const milestones = useMemo(() => roadmapMilestones(state), [state]);
  const title = baseline.occupation?.title ?? demoRoles.find(r => r.id === targetRoleId)?.title ?? t('rm.selectedRole');
  const input = {
    milestones, roleId: targetRoleId, roleTitle: title, occupation: baseline.occupation,
    hoursPerWeek: preferences.hours, budgetMYR: preferences.budget, freeOnly: preferences.freeOnly,
    now: new Date(),
  };
  const plan = resolveActivePathway(state, preferences)!;
  const candidate = buildPathway({ ...input, scenario, signals, researchWeights: ai.weights });
  const fingerprint = priorityFingerprint(candidate);
  const changed = fingerprint !== priorityFingerprint(plan) && fingerprint !== preferences.ignoredFingerprint;
  const changes = changed ? describePlanChanges(plan, candidate) : [];
  const reason = preferences.accepted.scenario !== scenario
    ? t('rm.reasonScenario', { scenario: scenario === 'fast' ? t('rm.fastShort') : t('rm.moderateShort') })
    : t('rm.reasonData');
  const isDone = (step: PathwayStep) => stepIsDone(state, step);
  return <><AiResearchEvidence controls />
    <p className="small muted">{t('rm.savedInput', { source: preferences.accepted.researchSource === 'demo' ? t('rm.srcDemo') : preferences.accepted.researchFetchedAt ? `arXiv API · ${preferences.accepted.researchFetchedAt}` : t('rm.srcNone') })}</p>
    <PathwayView plan={plan} targetTitle={title} sampleLabel={baseline.sampleLabel}
    hours={preferences.hours} budget={preferences.budget} freeOnly={preferences.freeOnly} scenario={scenario} planScenario={preferences.accepted.scenario}
    onHoursChange={hours => setPreferences(p => ({ ...p, hours }))}
    onBudgetChange={budget => setPreferences(p => ({ ...p, budget }))}
    onFreeOnlyChange={freeOnly => setPreferences(p => ({ ...p, freeOnly }))}
    onScenarioChange={setScenario}
    isDone={isDone} onToggle={(step, done) => step.milestoneIds.forEach(id => setMilestoneComplete(completionKey(state.audience, id), done))}
    onReviewTwin={() => navigate('/my-profile?section=twin')}
    onReset={() => { resetActiveRoadmap(); try { window.localStorage.removeItem(key); } catch { /* Workspace still reports unavailable storage. */ } }}
    pendingChange={changed ? { reason, changes: changes.length ? changes : [t('rm.scenarioChanged')] } : undefined}
    onAcceptChanges={() => setPreferences(p => ({ ...p, accepted: { scenario, signals, researchWeights: ai.weights,
      researchFetchedAt: ai.data?.snapshot?.fetchedAt, researchSource: ai.demo ? 'demo' : ai.data?.snapshot ? 'arxiv' : 'unavailable' }, ignoredFingerprint: undefined }))}
    onKeepPlan={() => setPreferences(p => ({ ...p, ignoredFingerprint: fingerprint }))}
    storageWarning={[storageWarning, saveWarning, scenarioWarning, marketWarning].filter(Boolean).join(' ')} /></>;
}
