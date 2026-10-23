import { useEffect, useState } from 'react';
import type { PlanningScenario } from '@workspace/workforce-evidence';
import { PLANNING_SCENARIO_EVENT, PLANNING_SCENARIO_KEY } from '@/domain/planning-scenario';

export function usePlanningScenario() {
  const read = (): PlanningScenario => {
    try { return window.localStorage.getItem(PLANNING_SCENARIO_KEY) === 'fast' ? 'fast' : 'moderate'; }
    catch { return 'moderate'; }
  };
  const [scenario, setValue] = useState<PlanningScenario>(read);
  const [warning, setWarning] = useState('');
  useEffect(() => {
    const sync = () => setValue(read());
    window.addEventListener('storage', sync);
    window.addEventListener(PLANNING_SCENARIO_EVENT, sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(PLANNING_SCENARIO_EVENT, sync); };
  }, []);
  const setScenario = (value: PlanningScenario) => {
    setValue(value);
    try {
      window.localStorage.setItem(PLANNING_SCENARIO_KEY, value);
      setWarning('');
      window.dispatchEvent(new Event(PLANNING_SCENARIO_EVENT));
    } catch { setWarning('Scenario preference cannot be saved in this browser; it lasts for this page only.'); }
  };
  return { scenario, setScenario, scenarioWarning: warning };
}
