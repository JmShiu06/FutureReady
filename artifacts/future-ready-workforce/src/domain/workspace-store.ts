import { createContext, useContext } from 'react';
import type { Audience, DemoProfile, OfficialRoadmapOccupation, WorkspaceState } from './types';

export interface WorkspaceContextValue {
  state: WorkspaceState; profile: DemoProfile; targetRoleId: string; storageWarning: string;
  setAudience(audience: Audience): void; saveProfile(profile: DemoProfile): void;
  resetProfile(): void;
  startRoadmap(roleId: string, occupation?: OfficialRoadmapOccupation): void; resetActiveRoadmap(): void; setMilestoneComplete(key: string, done: boolean): void;
  startSampleRoadmap(occupation: OfficialRoadmapOccupation, presetId: string): void;
  confirmSkillUpdate(milestoneId: string, toLevel: number): string;
}
// Keep context identity independent of provider/component hot replacement.
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is required.');
  return context;
}
