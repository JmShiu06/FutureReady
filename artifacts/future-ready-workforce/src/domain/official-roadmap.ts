import type { OccupationEvidence, OccupationEvidenceResult } from '@workspace/api-client-react';
import { learningResources, learningResourceCatalog, occupationalLearningResources, practiceForSkill, roleSdgUseCases } from '@workspace/workforce-evidence';
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
      const occupational = occupationalLearningResources.find(r => r.skills.some(s => normalize(s) === normalize(skill.name)));
      const practice = practiceForSkill(skill.name);
      const context = roleSdgUseCases[occupation.id]?.context ?? 'a fictional example of the cited occupational duties';
      const hasResource = !!(resource || occupational);
      return {
        id: `${officialPlanId(occupation.id)}:${skill.elementId}`, skill: skill.name,
        title: resource?.title ?? occupational?.title ?? `Self-directed practice: ${skill.name}`,
        provider: resource?.provider ?? occupational?.provider ?? 'App-authored practice · not a course',
        verifiedUrl: resource?.url ?? occupational?.url ?? null, synthetic: false,
        durationHours: resource ? resource.duration_minutes / 60 : occupational?.hours ?? practice.hours,
        costMYR: 0,
        kind: hasResource ? 'course' as const : 'practice' as const,
        activity: hasResource ? `Study the linked material for ${skill.name}. Apply the ideas to ${context}; do not use real personal records.` : `Context: ${context}. ${practice.activity}`,
        timeBasis: resource ? 'Provider-stated study time' : occupational?.timeBasis ?? practice.timeBasis,
        costCaveat: occupational?.costCaveat ?? (resource ? 'Free learning content at review; accounts, tools or optional credentials may have separate costs. Check the provider.' : 'No purchase required for this fictional exercise. Device/internet costs excluded. Paid course availability, coverage and price remain unknown.'),
        reviewedAt: occupational?.reviewedAt ?? (resource ? learningResourceCatalog.reviewed_at : practice.reviewedAt),
        coverage: occupational?.coverage ?? (resource ? `Reviewed exact-name coverage: ${resource.skills.join(', ')}.` : 'No verified course coverage for this skill in the catalogue. This bounded exercise does not establish mastery or award credentials.'),
        evidenceUrl: occupation.sourceUrl,
        prerequisites: resource
          ? [...resource.prerequisites, ...resource.recommended_prerequisites, `Catalogue reviewed ${learningResourceCatalog.reviewed_at}; check current provider details.`]
          : occupational ? [...occupational.prerequisites] : ['Read the cited role/skill description; use only fictional data and an ordinary document or spreadsheet.'],
        priority: 'Medium', order: index + 1,
      };
    });
}
