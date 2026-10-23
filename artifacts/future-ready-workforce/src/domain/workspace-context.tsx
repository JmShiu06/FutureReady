import { useEffect, useRef, useState, type ReactNode } from 'react';
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-store';
export { useWorkspace } from './workspace-store';
import { blankProfile, migrateLegacySkills } from './demo-data';
import { clearPlanData, confirmSkillUpdate as applyConfirmation, resetActiveRoadmap as applyResetActiveRoadmap, setMilestoneComplete, startRoadmap as applyStartRoadmap } from './learning';
import { audiences, defaultWorkspace, loadWorkspace, persistWorkspace, profileSchema } from './storage';
import type { Audience, DemoProfile, OfficialRoadmapOccupation, WorkspaceState } from './types';
import { syntheticPlanningSkills, type PlanningScenario, type PlanningSignal, type CapabilityEffect } from '@workspace/workforce-evidence';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => {
    try {
      const saved = loadWorkspace(window.localStorage);
      const profiles = audiences.reduce((profiles, audience) => {
        const profile = saved.state.profiles[audience];
        profiles[audience] = {
          ...profile,
          skills: migrateLegacySkills(profile.skills),
        };
        return profiles;
      }, { ...saved.state.profiles });
      const state = { ...saved.state, profiles };
      return {
        ...saved,
        state,
        persistOnLoad: JSON.stringify(saved.state.profiles) !== JSON.stringify(profiles),
      };
    } catch {
      return {
        state: defaultWorkspace(),
        warning: 'Browser storage is unavailable. Changes last for this session only.',
        persistOnLoad: false,
      };
    }
  });
  const [state, setState] = useState(loaded.state);
  const [isSyntheticDemo, setDemo] = useState(false);
  const realState = useRef(loaded.state);
  const [planningScenario, setPlanningScenario] = useState<PlanningScenario>('moderate');
  const [planningSignalMode, setPlanningSignalMode] = useState<'real' | 'a' | 'b'>('real');
  const [planningAiMode, setPlanningAiMode] = useState<'real' | 'a' | 'b'>('real');
  const [planningSignals, setSignals] = useState<PlanningSignal[]>([]);
  const [planningEffects, setEffects] = useState<CapabilityEffect[]>([]);
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  const dirty = useRef(loaded.persistOnLoad);
  const latest = useRef(loaded.state);
  latest.current = state;
  useEffect(() => {
    if (!dirty.current || isSyntheticDemo) return;
    realState.current = state;
    try { setStorageWarning(persistWorkspace(window.localStorage, state)); }
    catch { setStorageWarning('Browser storage is unavailable. Changes last for this session only.'); }
  }, [state, isSyntheticDemo]);
  const update = (transform: (current: WorkspaceState) => WorkspaceState) => {
    dirty.current = true;
    setState(transform);
  };
  const saveProfile = (profile: DemoProfile) => {
    const validated = profileSchema.parse(profile) as DemoProfile;
    update(s => ({ ...s, profiles: { ...s.profiles, [validated.audience]: validated } }));
  };
  const value: WorkspaceContextValue = {
    isSyntheticDemo, planningScenario, setPlanningScenario, planningSignals, planningEffects,
    planningSignalMode, setPlanningSignalMode, planningAiMode, setPlanningAiMode,
    setPlanningEvidence: (signals, effects) => { setSignals(signals); setEffects(effects); },
    startSyntheticDemo: () => {
      if (isSyntheticDemo) return;
      realState.current = latest.current;
      const demo = defaultWorkspace();
      demo.profiles.adult = { ...demo.profiles.adult, occupation: 'Fictional career explorer', experienceYears: 2, interests: ['Technology', 'People'],
        learningHours: 5, budgetMYR: 0, skills: syntheticPlanningSkills.map(name => ({ name, level: 2, category: 'Isolated synthetic demo' })) };
      setDemo(true); setState(demo); setPlanningScenario('moderate'); setPlanningSignalMode('a'); setPlanningAiMode('a');
    },
    exitSyntheticDemo: () => { setDemo(false); dirty.current = false; setState(realState.current); setSignals([]); setEffects([]); setPlanningSignalMode('real'); setPlanningAiMode('real'); },
    state, profile: state.profiles[state.audience], targetRoleId: state.targets[state.audience], storageWarning,
    setAudience: audience => update(s => ({ ...s, audience })),
    saveProfile,
    resetProfile: () => update(s => ({
      ...clearPlanData(s, s.audience), profiles: { ...s.profiles, [s.audience]: blankProfile(s.audience) },
    })),
    startRoadmap: (roleId, occupation) => update(s => applyStartRoadmap(s, roleId, new Date(), occupation)),
    resetActiveRoadmap: () => update(s => applyResetActiveRoadmap(s)),
    setMilestoneComplete: (key, done) => update(s => setMilestoneComplete(s, key, done)),
    confirmSkillUpdate: (milestoneId, toLevel) => {
      // Evaluate against the latest committed state so a double click cannot confirm twice.
      const result = applyConfirmation(latest.current, { milestoneId, toLevel });
      if (result.error) return result.error;
      latest.current = result.state;
      update(() => result.state);
      return '';
    },
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
