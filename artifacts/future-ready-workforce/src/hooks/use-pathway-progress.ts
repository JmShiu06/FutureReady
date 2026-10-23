import { useEffect, useState } from 'react';
import { useWorkspace } from '@/domain/workspace-context';
import { activeBaseline } from '@/domain/learning';
import { pathwaySamples } from '@/domain/pathway-samples';
import { readPathwayPreferences } from '@/domain/pathway-preferences';
import { pathwaySettingsKey, resolveActivePathway, pathwayProgress, stepIsDone } from '@/domain/pathway-progress';
import { usePlanningScenario } from './use-planning-scenario';
export const PATHWAY_SETTINGS_EVENT = 'frw-pathway-settings-changed';
export function usePathwayProgress() {
  const { state, profile } = useWorkspace();
  const { scenario } = usePlanningScenario();
  const [, rerender] = useState(0);
  useEffect(() => {
    const update = () => rerender(n => n + 1);
    window.addEventListener(PATHWAY_SETTINGS_EVENT, update); window.addEventListener('storage', update);
    return () => { window.removeEventListener(PATHWAY_SETTINGS_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  const baseline = activeBaseline(state);
  const sample = pathwaySamples.find(s => s.label === baseline?.sampleLabel);
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(pathwaySettingsKey(state)); } catch { /* Session-only fallback; workspace surfaces warning. */ }
  const prefs = readPathwayPreferences(raw, scenario, [], sample?.hours ?? profile.learningHours ?? 5, sample?.budget ?? profile.budgetMYR ?? 0).value;
  const plan = resolveActivePathway(state, prefs);
  return { plan, ...(plan ? pathwayProgress(plan, step => stepIsDone(state, step)) : { done: 0, total: 0, percent: 0 }) };
}
