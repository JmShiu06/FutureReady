import { z } from "zod";
import rawDataset from "../data/career_roles.json";

/**
 * Dataset skill-overlap matching.
 *
 * The dataset (src/data/career_roles.json) is imported rather than read from
 * disk, so esbuild bundles it into dist/index.mjs and it is always present in
 * the production build, regardless of the working directory.
 *
 * Score = matched skills / skills considered (always 30) x 100.
 * This is dataset skill overlap, NOT a probability of employment.
 */

export const SKILLS_PER_ROLE = 30;

const DatasetSchema = z.object({
  intended_use: z.string().min(1),
  matching_guidance: z.object({ caution: z.string().min(1) }),
  source: z.object({
    dataset_name: z.string().min(1),
    publisher: z.string().min(1),
    dataset_period: z.string().min(1),
    license: z.string().min(1),
    citation: z.string().min(1),
    source_urls: z.array(z.string().min(1)).min(1),
    geography_note: z.string().min(1),
    measurement_note: z.string().min(1),
  }),
  skills_by_role: z
    .array(
      z.object({
        role_family: z.string().min(1),
        skills: z
          .array(z.object({ skill: z.string().min(1) }))
          .length(SKILLS_PER_ROLE),
      }),
    )
    .min(1),
});

/**
 * Normalizes a skill name for exact comparison: Unicode NFKC, trim, lower-case
 * and collapse runs of whitespace. Punctuation is preserved on purpose so that
 * node.js, ci/cd, c++ and c# remain distinct, meaningful names.
 */
export function normalizeSkill(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

export interface RoleSkills {
  roleFamily: string;
  skills: string[];
}

export interface CareerMatch {
  roleFamily: string;
  score: number;
  skillsConsidered: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface CareerDataset {
  roles: RoleSkills[];
  allSkills: string[];
  source: {
    datasetName: string;
    publisher: string;
    period: string;
    license: string;
    citation: string;
    urls: string[];
    intendedUse: string;
    geographyNote: string;
    measurementNote: string;
  };
}

/** Validates and prepares a raw dataset object. Throws a clear error if invalid. */
export function buildDataset(raw: unknown): CareerDataset {
  const parsed = DatasetSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Career dataset is invalid: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const data = parsed.data;

  const roles: RoleSkills[] = data.skills_by_role.map((role) => {
    const skills = role.skills.map((s) => normalizeSkill(s.skill));
    if (new Set(skills).size !== skills.length) {
      throw new Error(
        `Career dataset is invalid: role "${role.role_family}" lists duplicate skills`,
      );
    }
    return { roleFamily: role.role_family, skills };
  });

  const allSkills = [...new Set(roles.flatMap((r) => r.skills))].sort((a, b) =>
    a.localeCompare(b),
  );

  return {
    roles,
    allSkills,
    source: {
      datasetName: data.source.dataset_name,
      publisher: data.source.publisher,
      period: data.source.dataset_period,
      license: data.source.license,
      citation: data.source.citation,
      urls: data.source.source_urls,
      intendedUse: data.intended_use,
      geographyNote: data.source.geography_note,
      measurementNote: data.source.measurement_note,
    },
  };
}

export const SCORING = {
  label: "Dataset skill overlap",
  formula: `matched skills / ${SKILLS_PER_ROLE} x 100`,
  note:
    "Each role family lists 30 skills from job-posting data. The score is the share of those 30 skills you listed. " +
    "It measures skill overlap with this dataset only. It is not a probability of getting a job, and it is not Malaysia-specific.",
} as const;

export function matchSkills(
  dataset: CareerDataset,
  rawSkills: string[],
  includeUnmatchedRoles = false,
): {
  normalizedSkills: string[];
  unrecognizedSkills: string[];
  matches: CareerMatch[];
} {
  const normalizedSkills = [
    ...new Set(rawSkills.map(normalizeSkill).filter((s) => s.length > 0)),
  ];
  const known = new Set(dataset.allSkills);
  const unrecognizedSkills = normalizedSkills.filter((s) => !known.has(s));
  const provided = new Set(normalizedSkills);

  const matches: CareerMatch[] = dataset.roles
    .map((role) => {
      const matchedSkills = role.skills.filter((s) => provided.has(s));
      const missingSkills = role.skills.filter((s) => !provided.has(s));
      const skillsConsidered = role.skills.length;
      return {
        roleFamily: role.roleFamily,
        score: Math.round((matchedSkills.length / skillsConsidered) * 1000) / 10,
        skillsConsidered,
        matchedSkills,
        missingSkills,
      };
    })
    .filter((m) => includeUnmatchedRoles || m.matchedSkills.length > 0)
    // Higher score first; ties broken alphabetically by role family so the
    // order is deterministic.
    .sort(
      (a, b) =>
        b.matchedSkills.length - a.matchedSkills.length ||
        a.roleFamily.localeCompare(b.roleFamily),
    );

  return { normalizedSkills, unrecognizedSkills, matches };
}

/** Loaded and validated once at startup; the server fails loudly if invalid. */
export const careerDataset: CareerDataset = buildDataset(rawDataset);
