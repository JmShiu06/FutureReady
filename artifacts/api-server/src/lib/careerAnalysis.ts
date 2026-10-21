import type { CvProfileSuggestions } from "@workspace/api-zod";
import {
  learningResourceCatalog,
  learningResources,
  type VerifiedLearningResource,
} from "../data/learningResources";
import {
  careerDataset,
  matchSkills,
  normalizeSkill,
  type CareerMatch,
} from "./careerMatcher";
import { detectProfileSuggestions, detectSkills } from "./cvSkillExtractor";
import { getSyntheticAiSkillReference } from "./syntheticAiSkillReference";

const METHOD_NOTE =
  "Deterministic exact-skill comparison against the bundled role-skill dataset. This is not an AI prediction, employment probability, or validated readiness assessment.";

export interface ResumeAnalysisReport {
  recognized_skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  missing_skills: string[];
  emerging_skills: string[];
  recommended_learning_path: string[];
  skill_score: number | null;
  career_readiness: string;
  candidate_level: string | null;
  similar_profiles: string[];
  profile_suggestions: CvProfileSuggestions;
  methodology: string;
  limitations: string[];
  source: typeof careerDataset.source;
}

export interface SkillGapReport {
  target_role: string;
  current_skills: string[];
  missing_skills: string[];
  recommended_courses: string[];
  recommended_learning_path: string[];
  estimated_learning_time: string | null;
  learning_resources: {
    status: "available" | "none_verified";
    catalog: typeof learningResourceCatalog;
    resources: VerifiedLearningResource[];
  };
  overlap_score: number;
  methodology: string;
  limitations: string[];
  synthetic_ai_skill_reference: ReturnType<typeof getSyntheticAiSkillReference>;
  source: typeof careerDataset.source;
}

function resourcesForMissingSkills(missingSkills: string[]): VerifiedLearningResource[] {
  const missing = new Set(missingSkills);
  return learningResources.filter((resource) =>
    resource.skills.some((skill) => missing.has(skill)),
  );
}
export interface CareerPathReport {
  suitable_roles: CareerMatch[];
  growth_path: string[];
  methodology: string;
  limitations: string[];
  source: typeof careerDataset.source;
}

export interface ProfileSimilarityReport {
  similar_profiles: never[];
  common_skills: string[];
  recommended_next_skills: string[];
  methodology: string;
  limitations: string[];
  source: typeof careerDataset.source;
}

function recognizedSkills(resumeText: string): string[] {
  return detectSkills(resumeText);
}

function topRoleMatches(skills: string[]): CareerMatch[] {
  return matchSkills(careerDataset, skills).matches.slice(0, 5);
}

function resolveRole(roleName: string): string | undefined {
  const normalizedRole = normalizeSkill(roleName);
  return careerDataset.roles.find(
    (role) => normalizeSkill(role.roleFamily) === normalizedRole,
  )?.roleFamily;
}

export function analyzeResumeText(resumeText: string): ResumeAnalysisReport {
  const skills = recognizedSkills(resumeText);
  return {
    recognized_skills: skills,
    // The bundled dataset has no validated skill-category labels.
    technical_skills: [],
    soft_skills: [],
    missing_skills: [],
    emerging_skills: [],
    recommended_learning_path: [],
    skill_score: null,
    career_readiness: "Not assessed by the available dataset.",
    candidate_level: null,
    similar_profiles: [],
    profile_suggestions: detectProfileSuggestions(resumeText),
    methodology: METHOD_NOTE,
    limitations: [
      "Skills are exact-name detections from the dataset vocabulary; review them before use.",
      "No skill taxonomy is available to separate technical from soft skills.",
      "The data contains no dated trend series, candidate profiles, validated score labels, or course catalogue.",
      "A target role is required to calculate a role-specific skill gap or learning sequence.",
    ],
    source: careerDataset.source,
  };
}

export function analyzeSkillGap(
  resumeText: string,
  requestedRole: string,
): SkillGapReport | undefined {
  const targetRole = resolveRole(requestedRole);
  if (!targetRole) return undefined;

  const skills = recognizedSkills(resumeText);
  const match = matchSkills(careerDataset, skills, true).matches.find(
    (item) => item.roleFamily === targetRole,
  );
  if (!match) return undefined;
  const matchedResources = resourcesForMissingSkills(match.missingSkills);

  return {
    target_role: targetRole,
    current_skills: match.matchedSkills,
    missing_skills: match.missingSkills,
    recommended_courses: matchedResources.map((resource) => resource.title),
    recommended_learning_path: match.missingSkills.slice(0, 8),
    estimated_learning_time: estimateLearningTime(matchedResources),
    learning_resources: {
      status: matchedResources.length > 0 ? "available" : "none_verified",
      catalog: learningResourceCatalog,
      resources: matchedResources,
    },
    overlap_score: match.score,
    methodology:
      `${METHOD_NOTE} A separate synthetic AI-skill reference is provided when a documented role mapping exists; it does not affect the overlap score.`,
    limitations: [
      "The learning sequence follows the dataset's listed skill order; it is not a validated prerequisite sequence.",
      "Learning resources are only listed for missing skills with a reviewed provider resource; other missing skills may have no verified resource.",
      "Estimated learning time sums provider-published durations for the listed resources and may vary by learner.",
      "The overlap score is not a probability of employment or a readiness score.",
      ...getSyntheticAiSkillReference(targetRole).limitations,
    ],
    synthetic_ai_skill_reference: getSyntheticAiSkillReference(targetRole),
    source: careerDataset.source,
  };
}

export function analyzeCareerPath(resumeText: string): CareerPathReport {
  const skills = recognizedSkills(resumeText);
  const suitableRoles = topRoleMatches(skills);
  return {
    suitable_roles: suitableRoles,
    growth_path: suitableRoles[0]?.missingSkills.slice(0, 8) ?? [],
    methodology: METHOD_NOTE,
    limitations: [
      "Roles are ranked by exact matched-skill count; ties use the existing alphabetical ordering.",
      "The score measures overlap with the bundled role lists only, not career suitability or hiring probability.",
      "A growth path is an illustrative list of missing skills, not a predicted career progression.",
    ],
    source: careerDataset.source,
  };
}

export function analyzeProfileSimilarity(
  resumeText: string,
): ProfileSimilarityReport {
  const skills = recognizedSkills(resumeText);
  const suitableRoles = topRoleMatches(skills);
  const recommendedNextSkills = [...new Set(
    suitableRoles.flatMap((role) => role.missingSkills.slice(0, 5)),
  )].slice(0, 10);

  return {
    // The bundled data contains role skills, not candidate profiles.
    similar_profiles: [],
    common_skills: [],
    recommended_next_skills: recommendedNextSkills,
    methodology: METHOD_NOTE,
    limitations: [
      "No candidate-profile records are available, so profile similarity and peer common skills are not calculated.",
      "Next skills are drawn from missing skills in the top role-overlap results; they are illustrative, not personalized predictions.",
    ],
    source: careerDataset.source,
  };
}

function estimateLearningTime(resources: VerifiedLearningResource[]): string | null {
  if (resources.length === 0) return null;
  const totalMinutes = resources.reduce(
    (total, resource) => total + resource.duration_minutes,
    0,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [
    hours > 0 ? `${hours} hr${hours === 1 ? "" : "s"}` : "",
    minutes > 0 ? `${minutes} min` : "",
  ].filter(Boolean).join(" ");
}
