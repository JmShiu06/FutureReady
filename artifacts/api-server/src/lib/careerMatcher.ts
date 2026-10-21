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

export type SkillMatchType = "exact" | "related";

export interface SkillMapping {
  profileSkill: string;
  datasetSkill: string;
  matchType: SkillMatchType;
}

interface RelatedSkillRule {
  datasetSkill: string;
  aliases: readonly string[];
  pattern: RegExp;
}

/**
 * Small, explicit local synonym set. Related matches are surfaced to the user
 * and never added to the saved profile without the existing review step.
 */
const RELATED_SKILL_RULES: readonly RelatedSkillRule[] = [
  {
    datasetSkill: "project management",
    aliases: ["project coordination", "project coordinator", "project scheduling", "coordinating projects"],
    pattern: /\b(?:coordinat\w*|schedul\w*|plan\w*|manag\w*|track\w*|deliver\w*)\b.{0,40}\bprojects?\b|\bprojects?\b.{0,40}\b(?:coordinat\w*|schedul\w*|plan\w*|manag\w*|track\w*|deliver\w*)\b/,
  },
  {
    datasetSkill: "user research",
    aliases: ["customer research", "customer interviews", "user interviews", "user needs research", "interviewing users", "interviewed users"],
    pattern: /\b(?:customer|user)s?\b.{0,32}\b(?:research\w*|interview\w*|survey\w*|usability tests?)\b|\b(?:research\w*|interview\w*|survey\w*|usability tests?)\b.{0,32}\b(?:customer|user)s?\b/,
  },
  {
    datasetSkill: "data visualization",
    aliases: ["data storytelling", "storytelling with data", "presenting data insights", "visual data communication"],
    pattern: /\b(?:data|insights?|metrics?)\b.{0,36}\b(?:story\w*|visual\w*|present\w*|communicat\w*|dashboard\w*|charts?)\b|\b(?:story\w*|visual\w*|present\w*|communicat\w*|dashboard\w*|charts?)\b.{0,36}\b(?:data|insights?|metrics?)\b/,
  },
  {
    datasetSkill: "business analysis",
    aliases: ["process improvement", "workflow improvement", "process optimization", "workflow optimization"],
    pattern: /\b(?:process|workflow)s?\b.{0,36}\b(?:improv\w*|optim\w*|streamlin\w*|analy[sz]\w*)\b|\b(?:improv\w*|optim\w*|streamlin\w*|analy[sz]\w*)\b.{0,36}\b(?:process|workflow)s?\b/,
  },
  {
    datasetSkill: "communication",
    aliases: ["facilitation", "workshop facilitation", "meeting facilitation"],
    pattern: /\b(?:facilitat\w*|moderate\w*|chair\w*)\b.{0,32}\b(?:meetings?|workshops?|sessions?)\b|\b(?:meetings?|workshops?|sessions?)\b.{0,32}\b(?:facilitat\w*|moderate\w*|chair\w*)\b/,
  },
  {
    datasetSkill: "analytical",
    aliases: ["critical thinking", "analytical thinking", "logical reasoning"],
    pattern: /\b(?:critical|analytical|logical)\b.{0,20}\b(?:thinking|reasoning|analysis)\b/,
  },
];

function relatedSkillTarget(
  dataset: CareerDataset,
  rawSkill: string,
): string | undefined {
  const normalized = normalizeSkill(rawSkill);
  const known = new Set(dataset.allSkills);
  return RELATED_SKILL_RULES.find((rule) =>
    known.has(rule.datasetSkill) &&
    (rule.aliases.includes(normalized) || rule.pattern.test(normalized)),
  )?.datasetSkill;
}

/** Detects reviewed related wording without returning any surrounding CV text. */
export function detectRelatedSkillMappingsInText(
  text: string,
  catalogue: readonly string[] = careerDataset.allSkills,
): SkillMapping[] {
  const normalizedText = normalizeSkill(text);
  const known = new Set(catalogue.map(normalizeSkill));
  return RELATED_SKILL_RULES
    .flatMap((rule) => {
      if (!known.has(rule.datasetSkill)) return [];
      const matchedAlias = rule.aliases.find((alias) => phraseOccurs(normalizedText, alias));
      if (!matchedAlias && !rule.pattern.test(normalizedText)) return [];
      return [{
        profileSkill: matchedAlias ?? rule.aliases[0],
        datasetSkill: rule.datasetSkill,
        matchType: "related" as const,
      }];
    });
}

/** Detects related dataset skill names from text without exposing the source text. */
export function detectRelatedSkillsInText(
  text: string,
  catalogue: readonly string[] = careerDataset.allSkills,
): string[] {
  return detectRelatedSkillMappingsInText(text, catalogue)
    .map((mapping) => mapping.datasetSkill);
}

function phraseOccurs(text: string, phrase: string): boolean {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(
    `(?<![\\p{L}\\p{N}_+#/-])${escaped}(?![\\p{L}\\p{N}_+#/-])`,
    "iu",
  ).test(text);
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
    "Each role family lists 30 skills from job-posting data. Exact names and a small reviewed set of related skill phrases are compared with your profile; related matches are labeled. " +
    "The score measures overlap with this dataset only. It is not a probability of getting a job, and it is not Malaysia-specific.",
} as const;

const knownSkillSets = new WeakMap<CareerDataset, ReadonlySet<string>>();

function knownSkills(dataset: CareerDataset): ReadonlySet<string> {
  let known = knownSkillSets.get(dataset);
  if (!known) {
    known = new Set(dataset.allSkills);
    knownSkillSets.set(dataset, known);
  }
  return known;
}

/**
 * Exact normalized skill overlap: matched skills / skills considered x 100,
 * rounded to one decimal place. Shared by every dataset-overlap score so
 * there is one formula. `skills` must already be normalized.
 */
export function skillOverlap(
  skills: readonly string[],
  provided: ReadonlySet<string>,
): Omit<CareerMatch, "roleFamily"> {
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const skill of skills) {
    (provided.has(skill) ? matchedSkills : missingSkills).push(skill);
  }
  return {
    score: skills.length ? Math.round((matchedSkills.length / skills.length) * 1000) / 10 : 0,
    skillsConsidered: skills.length,
    matchedSkills,
    missingSkills,
  };
}

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
  const known = knownSkills(dataset);
  const unrecognizedSkills = normalizedSkills.filter((s) => !known.has(s));
  const provided = new Set(normalizedSkills);

  const matches: CareerMatch[] = dataset.roles
    .map((role) => ({ roleFamily: role.roleFamily, ...skillOverlap(role.skills, provided) }))
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

/**
 * Matches saved profile skill labels to dataset vocabulary using exact names
 * first, then a small explicit alias set. Each dataset skill contributes at
 * most once to a role score.
 */
export function matchProfileSkills(
  dataset: CareerDataset,
  rawSkills: string[],
): {
  normalizedSkills: string[];
  unrecognizedSkills: string[];
  skillMappings: SkillMapping[];
  matches: CareerMatch[];
} {
  const inputs = new Map<string, string>();
  for (const rawSkill of rawSkills) {
    const display = rawSkill.normalize("NFKC").trim().replace(/\s+/g, " ");
    const normalized = normalizeSkill(display);
    if (normalized && !inputs.has(normalized)) inputs.set(normalized, display);
  }

  const known = knownSkills(dataset);
  const candidates: SkillMapping[] = [];
  for (const [normalized, profileSkill] of inputs.entries()) {
    if (known.has(normalized)) {
      candidates.push({ profileSkill, datasetSkill: normalized, matchType: "exact" });
      continue;
    }
    const datasetSkill = relatedSkillTarget(dataset, profileSkill);
    if (datasetSkill) candidates.push({ profileSkill, datasetSkill, matchType: "related" });
  }

  const mappingsByDatasetSkill = new Map<string, SkillMapping>();
  for (const candidate of candidates) {
    const current = mappingsByDatasetSkill.get(candidate.datasetSkill);
    if (!current || candidate.matchType === "exact") {
      mappingsByDatasetSkill.set(candidate.datasetSkill, candidate);
    }
  }
  const skillMappings = [...mappingsByDatasetSkill.values()];
  const recognizedInputs = new Set(candidates.map((candidate) => normalizeSkill(candidate.profileSkill)));
  const normalizedSkills = [...inputs.keys()];
  const unrecognizedSkills = normalizedSkills.filter((skill) => !recognizedInputs.has(skill));
  const datasetSkills = skillMappings.map((mapping) => mapping.datasetSkill);
  const matches = matchSkills(dataset, datasetSkills).matches;

  return { normalizedSkills, unrecognizedSkills, skillMappings, matches };
}

/** Loaded and validated once at startup; the server fails loudly if invalid. */
export const careerDataset: CareerDataset = buildDataset(rawDataset);
