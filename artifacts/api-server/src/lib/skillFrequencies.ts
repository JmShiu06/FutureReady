import { z } from "zod";
import rawDataset from "../data/career_roles.json";

/**
 * Read-only view of the Qarera posting-frequency data already bundled for
 * career matching. Values are published shares of job postings that mention a
 * skill; they are not Malaysia-specific and not a trend.
 */
const schema = z.object({
  source: z.object({
    dataset_name: z.string(),
    publisher: z.string(),
    dataset_period: z.string(),
    license: z.string(),
    citation: z.string(),
    source_urls: z.array(z.string()),
    geography_note: z.string(),
    measurement_note: z.string(),
  }),
  skills_by_role: z.array(
    z.object({
      role_family: z.string(),
      role_postings: z.number().int().nonnegative(),
      skills: z.array(
        z.object({
          skill: z.string(),
          postings_with_skill: z.number().int().nonnegative(),
          pct_of_role: z.number().min(0).max(100),
        }),
      ),
    }),
  ),
});

const data = schema.parse(rawDataset);

export const SKILL_FREQUENCY_TOP_N = 10;

export function getSkillFrequencies() {
  return {
    roles: data.skills_by_role.map((role) => ({
      roleFamily: role.role_family,
      rolePostings: role.role_postings,
      skills: [...role.skills]
        .sort((a, b) => b.pct_of_role - a.pct_of_role || a.skill.localeCompare(b.skill))
        .slice(0, SKILL_FREQUENCY_TOP_N)
        .map((s) => ({ skill: s.skill, postingsWithSkill: s.postings_with_skill, percentOfRolePostings: s.pct_of_role })),
    })),
    source: {
      datasetName: data.source.dataset_name,
      publisher: data.source.publisher,
      period: data.source.dataset_period,
      license: data.source.license,
      citation: data.source.citation,
      urls: data.source.source_urls,
      geographyNote: data.source.geography_note,
      measurementNote: data.source.measurement_note,
    },
    limitations: [
      "Global job-posting frequencies for one period; this is a snapshot, not a trend, and not Malaysia-specific.",
      "Percentages are shares of postings that mention a skill, not proof a skill is required or growing.",
      "Role families are grouped from titles by keyword.",
    ],
  };
}
