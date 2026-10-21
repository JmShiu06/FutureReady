import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { blankProfile, demoRoles, sampleProfile } from './demo-data';
import { defaultWorkspace, loadWorkspace, persistWorkspace, profileSchema } from './storage';
import type { Audience, DemoProfile, WorkspaceState } from './types';

interface WorkspaceContextValue {
  state: WorkspaceState; profile: DemoProfile; targetRoleId: string; storageWarning: string;
  setAudience(audience: Audience): void; saveProfile(profile: DemoProfile): void;
  resetProfile(): void; loadSample(variant: 'default' | 'data'): void;
  setTargetRole(id: string): void; toggleCompletion(key: string): void;
}
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => {
    try { return loadWorkspace(window.localStorage); }
    catch { return { state: defaultWorkspace(), warning: 'Browser storage is unavailable. Changes last for this session only.' }; }
  });
  const [state, setState] = useState(loaded.state);
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  const dirty = useRef(false);
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
      ...s, profiles: { ...s.profiles, [s.audience]: blankProfile(s.audience) },
      completion: Object.fromEntries(Object.entries(s.completion).filter(([key]) => !key.startsWith(`${s.audience}:`))),
    })),
    loadSample: variant => saveProfile(sampleProfile(state.audience, variant)),
    setTargetRole: id => {
      if (!demoRoles.some(role => role.id === id)) throw new Error('Choose an available demo career.');
      update(s => ({ ...s, targets: { ...s.targets, [s.audience]: id } }));
    },
    toggleCompletion: key => update(s => ({ ...s, completion: { ...s.completion, [key]: !s.completion[key] } })),
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is required.');
  return context;
}
