import { createContext, useContext } from 'react';
import type { Audience, DemoProfile, OfficialRoadmapOccupation, WorkspaceState } from './types';
import type { PlanningScenario, PlanningSignal, CapabilityEffect } from '@workspace/workforce-evidence';

export interface WorkspaceContextValue {
  isSyntheticDemo: boolean; startSyntheticDemo(): void; exitSyntheticDemo(): void;
  planningScenario: PlanningScenario; setPlanningScenario(value: PlanningScenario): void;
  planningSignalMode: 'real' | 'a' | 'b'; setPlanningSignalMode(value: 'real' | 'a' | 'b'): void;
  planningAiMode: 'real' | 'a' | 'b'; setPlanningAiMode(value: 'real' | 'a' | 'b'): void;
  planningSignals: PlanningSignal[]; planningEffects: CapabilityEffect[];
  setPlanningEvidence(signals: PlanningSignal[], effects: CapabilityEffect[]): void;
  state: WorkspaceState; profile: DemoProfile; targetRoleId: string; storageWarning: string;
  setAudience(audience: Audience): void; saveProfile(profile: DemoProfile): void;
  resetProfile(): void;
  startRoadmap(roleId: string, occupation?: OfficialRoadmapOccupation): void; resetActiveRoadmap(): void; setMilestoneComplete(key: string, done: boolean): void;
  confirmSkillUpdate(milestoneId: string, toLevel: number): string;
}
// Keep context identity independent of provider/component hot replacement.
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is required.');
  return context;
}
