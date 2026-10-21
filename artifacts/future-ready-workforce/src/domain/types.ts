export type Audience = 'adult' | 'graduate' | 'hr' | 'education';
export type Proficiency = 1 | 2 | 3 | 4 | 5;
export interface ProfileSkill { name: string; level: Proficiency; category: string; cvDetected?: boolean }
export interface DemoProfile {
  id: string; audience: Audience; occupation: string; experienceYears: number | null;
  education: string; qualification: string; studyField: string; interests: string[];
  skills: ProfileSkill[]; location: string; workPreference: '' | 'Any' | 'Remote' | 'Hybrid' | 'On-site';
  learningHours: number | null; budgetMYR: number | null; goals: string;
}
export interface Evidence {
  kind: 'synthetic' | 'observed'; sourceName: string; sourceUrl: string | null;
  observationStart: string | null; observationEnd: string | null; lastUpdated: string | null; notes: string;
}
export interface RequiredSkill { name: string; level: Proficiency; priority: 'High' | 'Medium' | 'Low' }
export interface CareerRole {
  id: string; title: string; category: string; industry: string; description: string;
  requiredSkills: RequiredSkill[]; taskExposure: string; demandLabel: string; evidence: Evidence;
}
export interface SkillGap extends RequiredSkill { currentLevel: number; gap: number }
export interface CareerAssessment {
  role: CareerRole; readiness: number; present: SkillGap[]; missing: SkillGap[]; gaps: SkillGap[];
  methodology: string; illustrative: true;
}
export interface RadarFilters {
  category?: string; roleId?: string; industry?: string; region?: string; from?: string; to?: string;
}
export interface MarketObservation { date: string; value: number }
export interface SkillMarketRecord {
  id: string; skill: string; category: string; roleIds: string[]; industry: string; region: string;
  demandLabel: string; observations: MarketObservation[]; evidence: Evidence;
}
export interface LearningMilestone {
  id: string; skill: string; title: string; provider: string; verifiedUrl: string | null;
  synthetic: boolean; durationHours: number; costMYR: number; prerequisites: string[];
  priority: RequiredSkill['priority']; order: number;
}
export interface Scenario {
  id: 'moderate' | 'fast'; label: string; assumptions: string[]; prioritySkills: string[];
  roleImpacts: { roleId: string; explanation: string }[]; provenance: string; uncertainty: string;
  observedEvidence: Evidence | null;
}
export interface AggregateRecord {
  id: string; group: string; programme: string; skills: ProfileSkill[]; targetRoleId: string;
}
export interface SdgGoal { number: number; name: string }
export interface SdgMapping {
  goal: number; roleId: string; skills: string[]; explanation: string;
  status: 'source-supported' | 'unverified';
  sourceTitle: string | null; sourceUrl: string | null; sourceDate: string | null;
  sourceObservation: string | null;
}
/** Skills at the moment the user chose "Build my learning roadmap" for a role. Milestones are derived from it. */
export interface RoadmapBaseline { skills: ProfileSkill[]; startedAt: string }
/** A user-confirmed proficiency change. Kept apart from milestone completion; one per milestone. */
export interface SkillConfirmation {
  id: string; audience: Audience; roleId: string; milestoneId: string; skill: string;
  fromLevel: number; toLevel: Proficiency; confirmedAt: string;
}
export interface WorkspaceState {
  version: 1; audience: Audience; profiles: Record<Audience, DemoProfile>;
  targets: Record<Audience, string>; completion: Record<string, boolean>;
  /** Keyed `${audience}:${roleId}`; presence means a roadmap was explicitly built for that role. */
  baselines: Record<string, RoadmapBaseline>;
  /** Completion key -> ISO time the milestone was first completed (removed when reopened). */
  completedAt: Record<string, string>;
  confirmations: SkillConfirmation[];
}
export interface SimulationResult {
  before: CareerAssessment; after: CareerAssessment; readinessChange: number;
}
export interface WorkforceService {
  readonly mode: 'demo' | 'api';
  readonly capabilities: { liveMarketRefresh: boolean; cvExtraction: boolean };
  matchCareers(profile: DemoProfile, signal?: AbortSignal): Promise<CareerAssessment[]>;
  getSkillMarket(filters: RadarFilters, signal?: AbortSignal): Promise<SkillMarketRecord[]>;
  simulate(profile: DemoProfile, hypothetical: ProfileSkill[], roleId: string, signal?: AbortSignal): Promise<SimulationResult>;
  getRoadmap(profile: DemoProfile, roleId: string, signal?: AbortSignal): Promise<LearningMilestone[]>;
  refreshMarket(signal?: AbortSignal): Promise<void>;
}
