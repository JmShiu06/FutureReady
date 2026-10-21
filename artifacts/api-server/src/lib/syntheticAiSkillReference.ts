import { z } from "zod";
import rawReference from "../data/synthetic-ai-skill-reference.json";
import { normalizeSkill } from "./careerMatcher";

const ReferenceSchema = z.object({
  datasetName: z.string(),
  dataRowsIncluded: z.number().int().positive(),
  rowsExcludedMissingRole: z.number().int().nonnegative(),
  provenance: z.string(),
  roles: z.array(z.object({
    role: z.string(),
    sampleSize: z.number().int().positive(),
    means: z.object({
      ai: z.number().min(0).max(5),
      ml: z.number().min(0).max(5),
      deepLearning: z.number().min(0).max(5),
      generativeAi: z.number().min(0).max(5),
      promptEngineering: z.number().min(0).max(5),
      llmExperienceYears: z.number().nonnegative(),
    }),
    experienceShares: z.object({
      ragPercent: z.number().min(0).max(100),
      fineTuningPercent: z.number().min(0).max(100),
      vectorDatabasePercent: z.number().min(0).max(100),
    }),
  })).min(1),
});

const reference = ReferenceSchema.parse(rawReference);

// Deliberate crosswalks only: unmatched titles receive no substitute role.
const roleCrosswalk: Record<string, string[]> = {
  "security": ["Cybersecurity Analyst"],
  "data scientist / ml": ["Data Scientist", "ML Engineer"],
  "devops / cloud / sre": ["DevOps Engineer", "Cloud Architect"],
  "data analyst / bi": ["Data Analyst"],
  "qa / test": ["QA Engineer"],
  "designer (ux/ui)": ["UX Designer"],
};

const limitations = [
  "The archive documents synthetic, probabilistically generated applicant records; these are not observed workforce measurements.",
  "The generator intentionally assigns higher AI, ML and deep-learning values to selected AI-related roles. The resulting role differences are designed into the data, not independently discovered.",
  "Skill-level values are dataset means on a documented 0–5 scale; experience shares describe rows in this synthetic sample only.",
  "The archive does not provide its original publisher, source URL, or license. Treat this as an internal reference, not a verified external benchmark.",
  "This reference does not assess an individual, change skill matching or scores, predict hiring, or establish which skills a role requires.",
];

export function getSyntheticAiSkillReference(targetRole: string) {
  const key = normalizeSkill(targetRole);
  const mappedRoles = roleCrosswalk[key] ??
    reference.roles.filter((item) => normalizeSkill(item.role) === key).map((item) => item.role);
  const wanted = new Set(mappedRoles.map(normalizeSkill));
  return {
    references: reference.roles.filter((item) => wanted.has(normalizeSkill(item.role))),
    source: {
      datasetName: reference.datasetName,
      dataRowsIncluded: reference.dataRowsIncluded,
      rowsExcludedMissingRole: reference.rowsExcludedMissingRole,
      provenance: reference.provenance,
    },
    limitations,
  };
}
