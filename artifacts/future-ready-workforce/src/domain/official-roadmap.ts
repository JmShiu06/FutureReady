import type { OccupationEvidence, OccupationEvidenceResult } from '@workspace/api-client-react';
import { learningResources, learningResourceCatalog } from '@workspace/workforce-evidence';
import type { LearningMilestone, OfficialRoadmapOccupation, ProfileSkill, RoadmapBaseline, WorkspaceState } from './types';

const normalize = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export const officialPlanId = (id: string) => `official:${id}`;
export function occupationSnapshot(o: OccupationEvidence, data: OccupationEvidenceResult): OfficialRoadmapOccupation {
  if (o.recommendationStatus !== 'eligible' || o.mapping.status !== 'verified' || !o.documentedSkills.length) {
    throw new Error('A roadmap requires reviewed occupation skill evidence.');
  }
  return {
    id: o.id, title: o.mycol.title, edition: o.mycol.edition, masco4: o.mycol.masco4,
    onetCode: o.onet.code, onetTitle: o.onet.title, sourceUrl: o.onet.url, release: data.sources.onet.release,
    selectionRule: data.selectionRule, mappingLimitations: o.mapping.limitations,
    documentedSkills: o.documentedSkills.map(({ elementId, name, importance, level, levelLowPrecision }) => ({
      elementId, name, importance, level, levelLowPrecision,
    })),
  };
}
export function officialBaseline(state: WorkspaceState): RoadmapBaseline | null {
  const baseline = state.baselines[`${state.audience}:${state.targets[state.audience]}`];
  return baseline?.occupation ? baseline : null;
}
export function documentedOverlap(skills: ProfileSkill[], occupation: OfficialRoadmapOccupation) {
  const names = new Set(skills.map(s => normalize(s.name)));
  const matched = occupation.documentedSkills.filter(s => names.has(normalize(s.name))).length;
  return { matched, total: occupation.documentedSkills.length, score: occupation.documentedSkills.length ? Math.round(1000 * matched / occupation.documentedSkills.length) / 10 : 0 };
}
export function officialMilestones(baseline: RoadmapBaseline): LearningMilestone[] {
  const occupation = baseline.occupation!;
  const names = new Set(baseline.skills.map(s => normalize(s.name)));
  // Name overlap, not an invented conversion from O*NET's 0–7 levels to self-ratings.
  return occupation.documentedSkills.filter(s => !names.has(normalize(s.name)))
    .sort((a, b) => b.importance - a.importance || a.elementId.localeCompare(b.elementId))
    .map((skill, index) => {
      // Exact reviewed coverage only: e.g. Programming must not silently become Python.
      const resource = learningResources.find(r => r.skills.some(s => normalize(s) === normalize(skill.name)));
      return {
        id: `${officialPlanId(occupation.id)}:${skill.elementId}`, skill: skill.name,
        title: resource?.title ?? `Plan practice: ${skill.name}`,
        provider: resource?.provider ?? 'No verified learning resource available',
        verifiedUrl: resource?.url ?? null, synthetic: false,
        durationHours: resource ? resource.duration_minutes / 60 : null,
        costMYR: resource ? 0 : null,
        prerequisites: resource
          ? [...resource.prerequisites, ...resource.recommended_prerequisites, `Catalogue reviewed ${learningResourceCatalog.reviewed_at}; check current provider details.`]
          : ['Choose a suitable learning activity; cost, duration and prerequisites are unknown.'],
        priority: 'Medium', order: index + 1,
      };
    });
}
