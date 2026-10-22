import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { blankProfile, sampleProfile } from './demo-data';
import { clearPlanData, confirmSkillUpdate as applyConfirmation, setMilestoneComplete, startRoadmap as applyStartRoadmap } from './learning';
import { audiences, defaultWorkspace, loadWorkspace, persistWorkspace, profileSchema } from './storage';
import type { Audience, DemoProfile, OfficialRoadmapOccupation, WorkspaceState } from './types';

interface WorkspaceContextValue {
  state: WorkspaceState; profile: DemoProfile; targetRoleId: string; storageWarning: string;
  setAudience(audience: Audience): void; saveProfile(profile: DemoProfile): void;
  resetProfile(): void; loadSample(variant: 'default' | 'data'): void;
  startRoadmap(roleId: string, occupation?: OfficialRoadmapOccupation): void; setMilestoneComplete(key: string, done: boolean): void;
  confirmSkillUpdate(milestoneId: string, toLevel: number): string;
}
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => {
    try {
      const saved = loadWorkspace(window.localStorage);
      const profiles = audiences.reduce((profiles, audience) => {
        const profile = saved.state.profiles[audience];
        profiles[audience] = {
          ...profile,
          occupation: '',
          experienceYears: null,
          education: '',
          qualification: '',
          studyField: '',
          interests: [],
          location: '',
          workPreference: '',
          learningHours: null,
          budgetMYR: null,
          goals: '',
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
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  const dirty = useRef(loaded.persistOnLoad);
  const latest = useRef(loaded.state);
  latest.current = state;
  useEffect(() => {
    if (!dirty.current) return;
    try { setStorageWarning(persistWorkspace(window.localStorage, state)); }
    catch { setStorageWarning('Browser storage is unavailable. Changes last for this session only.'); }
  }, [state]);
  const update = (transform: (current: WorkspaceState) => WorkspaceState) => {
    dirty.current = true;
    setState(transform);
  };
  const saveProfile = (profile: DemoProfile) => {
    const validated = profileSchema.parse(profile) as DemoProfile;
    update(s => ({ ...s, profiles: { ...s.profiles, [validated.audience]: validated } }));
  };
  const value: WorkspaceContextValue = {
    state, profile: state.profiles[state.audience], targetRoleId: state.targets[state.audience], storageWarning,
    setAudience: audience => update(s => ({ ...s, audience })),
    saveProfile,
    resetProfile: () => update(s => ({
      ...clearPlanData(s, s.audience), profiles: { ...s.profiles, [s.audience]: blankProfile(s.audience) },
    })),
    loadSample: variant => saveProfile(sampleProfile(state.audience, variant)),
    startRoadmap: (roleId, occupation) => update(s => applyStartRoadmap(s, roleId, new Date(), occupation)),
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
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is required.');
  return context;
}
