import { z } from "zod";
import rawOnet from "../data/occupation-evidence/onet-31.0-skills.json";
import { mappingReview, occupationMappings, type OccupationMapping } from "../data/occupation-evidence/masco-onet-mapping";
import { mycolOccupations, mycolSource, type MycolOccupation } from "../data/occupation-evidence/mycol-2024-2025";
import { normalizeSkill, skillOverlap } from "./careerMatcher";

/**
 * Official occupation evidence: TalentCorp MyCOL 2024/2025 critical
 * occupations mapped to O*NET 31.0 occupations and their skill ratings.
 *
 * Kept separate from personal readiness, DOSM statistics and AI scenarios.
 * Profile skills are compared with O*NET skill names using the shared
 * dataset-overlap formula; O*NET ratings are reported on their own scales and
 * are never converted into 1-5 profile proficiency targets.
 */

/** SkillShift selection rule (not an O*NET rule): the midpoint of O*NET's 1-5 Importance scale. */
export const IMPORTANCE_THRESHOLD = 3;

const ratingSchema = z.object({
  value: z.number().finite(),
  n: z.number().int().nonnegative().nullable(),
  standardError: z.number().nullable(),
  lowerCiBound: z.number().nullable(),
  upperCiBound: z.number().nullable(),
  recommendSuppress: z.boolean(),
  notRelevant: z.boolean(),
  date: z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/),
  domainSource: z.string().min(1),
});

const onetSchema = z.object({
  release: z.literal("31.0"),
  releaseDate: z.string().min(1),
  taxonomy: z.literal("O*NET-SOC 2019"),
  files: z.array(z.object({ name: z.string(), url: z.string().url(), sha256: z.string().regex(/^[0-9a-f]{64}$/) })).min(1),
  scales: z.object({
    importance: z.object({ id: z.literal("IM"), name: z.literal("Importance"), minimum: z.literal(1), maximum: z.literal(5) }),
    level: z.object({ id: z.literal("LV"), name: z.literal("Level"), minimum: z.literal(0), maximum: z.literal(7) }),
  }),
  occupations: z.record(
    z.string().regex(/^\d{2}-\d{4}\.\d{2}$/),
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      skills: z.array(z.object({
        elementId: z.string().regex(/^2\.[AB]\.\d+\.[a-z]$/),
        name: z.string().min(1),
        domain: z.enum(["Essential", "Transferable"]),
        description: z.string().min(1).nullable(),
        importance: ratingSchema,
        level: ratingSchema,
      })),
    }),
  ),
});

type OnetData = z.infer<typeof onetSchema>;
type OnetSkill = OnetData["occupations"][string]["skills"][number];

export interface OccupationEvidenceData {
  onet: OnetData;
  mycol: MycolOccupation[];
  mappings: OccupationMapping[];
}

/** Validates the three sources and their cross-references. Throws a clear error if anything is inconsistent. */
export function buildOccupationEvidence(input: { onet: unknown; mycol: MycolOccupation[]; mappings: OccupationMapping[] }): OccupationEvidenceData {
  const parsed = onetSchema.safeParse(input.onet);
  if (!parsed.success) {
    throw new Error(`O*NET evidence is invalid: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const onet = parsed.data;
  const fail = (message: string): never => { throw new Error(`Occupation evidence is invalid: ${message}`); };

  for (const [code, occupation] of Object.entries(onet.occupations)) {
    const ids = new Set<string>();
    for (const skill of occupation.skills) {
      if (ids.has(skill.elementId)) fail(`${code} lists ${skill.elementId} twice`);
      ids.add(skill.elementId);
      const { importance, level } = skill;
      if (importance.value < onet.scales.importance.minimum || importance.value > onet.scales.importance.maximum) {
        fail(`${code} ${skill.name} importance is outside the 1-5 scale`);
      }
      if (level.value < onet.scales.level.minimum || level.value > onet.scales.level.maximum) {
        fail(`${code} ${skill.name} level is outside the 0-7 scale`);
      }
    }
  }

  const masco = new Set<string>();
  for (const occupation of input.mycol) {
    if (!/^\d{4}$/.test(occupation.masco4) || masco.has(occupation.masco4)) fail(`invalid or duplicate MASCO code ${occupation.masco4}`);
    masco.add(occupation.masco4);
    if (!occupation.title.trim() || !occupation.includedJobTitles.length) fail(`MyCOL ${occupation.masco4} needs a title and included job titles`);
    for (const code of occupation.masco6) {
      if (!new RegExp(`^${occupation.masco4}-\\d{2}$`).test(code)) fail(`6-digit code ${code} does not belong to ${occupation.masco4}`);
    }
  }

  const mapped = new Set<string>();
  for (const mapping of input.mappings) {
    const mycol = input.mycol.find((o) => o.masco4 === mapping.masco4);
    if (!mycol) fail(`mapping ${mapping.masco4} has no MyCOL occupation`);
    if (mycol!.title !== mapping.mycolTitle) fail(`mapping ${mapping.masco4} title does not match MyCOL`);
    const occupation = onet.occupations[mapping.onetSocCode];
    if (!occupation) fail(`mapping ${mapping.masco4} references ${mapping.onetSocCode}, which is not in the O*NET data`);
    if (occupation!.title !== mapping.onetTitle) fail(`mapping ${mapping.masco4} O*NET title does not match ${mapping.onetSocCode}`);
    if (mapped.has(mapping.masco4)) fail(`MyCOL ${mapping.masco4} is mapped more than once`);
    if (!mapping.rationale.trim() || !mapping.limitations.trim()) fail(`mapping ${mapping.masco4} needs a rationale and limitations`);
    mapped.add(mapping.masco4);
  }

  return { onet, mycol: input.mycol, mappings: input.mappings };
}

/** Skills O*NET rates at or above the importance threshold, without low-precision importance or "not relevant" flags. */
function documentedSkills(skills: OnetSkill[]): OnetSkill[] {
  return skills
    .filter((s) => s.importance.value >= IMPORTANCE_THRESHOLD && !s.importance.recommendSuppress && !s.level.notRelevant)
    .sort((a, b) => b.importance.value - a.importance.value || a.name.localeCompare(b.name));
}

const relationText: Record<OccupationMapping["relation"], string> = {
  exact: "an exact match",
  approximate: "an approximate match",
  broader: "a broader O*NET occupation",
  narrower: "a narrower O*NET occupation",
};

export const occupationEvidence = buildOccupationEvidence({ onet: rawOnet, mycol: mycolOccupations, mappings: occupationMappings });

export function getOccupationSources() {
  const { onet } = occupationEvidence;
  return {
    mycol: { ...mycolSource, masco6Note: "6-digit codes and included job titles are taken from each occupation's profile page." },
    onet: {
      name: `O*NET ${onet.release} Database`,
      release: onet.release,
      releaseDate: onet.releaseDate,
      taxonomy: onet.taxonomy,
      databaseUrl: "https://www.onetcenter.org/database.html",
      releasesUrl: "https://www.onetcenter.org/db_releases.html",
      license: "Creative Commons Attribution 4.0 International",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      licensePageUrl: "https://www.onetcenter.org/license_db.html",
      attribution:
        `This page includes information from the O*NET ${onet.release} Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA. SkillShift AI has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.`,
      modifications: `Only the mapped occupations are included, and only skills with Importance of at least ${IMPORTANCE_THRESHOLD} on the 1-5 scale are listed as documented skills. Ratings are otherwise unchanged.`,
      files: onet.files,
      scales: onet.scales,
      localDemandNote:
        "O*NET describes United States occupations. It documents skills used in an occupation; it does not measure Malaysian demand, vacancies or hiring likelihood.",
    },
    mapping: mappingReview,
  };
}

export function matchOccupations(rawSkills: string[]) {
  const provided = new Set(rawSkills.map(normalizeSkill).filter(Boolean));
  const { onet, mycol, mappings } = occupationEvidence;

  const occupations = mappings.map((mapping) => {
    const mycolOccupation = mycol.find((o) => o.masco4 === mapping.masco4)!;
    const onetOccupation = onet.occupations[mapping.onetSocCode]!;
    const documented = documentedSkills(onetOccupation.skills);
    const exclusionReason = mapping.status !== "verified"
      ? "The MASCO-to-O*NET mapping is ambiguous and unverified, so it is not used for recommendations."
      : onetOccupation.skills.length === 0
        ? `O*NET ${onet.release} publishes no skill ratings for this occupation, so no skill comparison is possible.`
        : null;
    const byKey = new Map(documented.map((s) => [normalizeSkill(s.name), s.name]));
    const overlap = exclusionReason ? null : skillOverlap([...byKey.keys()], provided);
    const matchedSkills = overlap?.matchedSkills.map((k) => byKey.get(k)!) ?? [];
    const missingSkills = overlap?.missingSkills.map((k) => byKey.get(k)!) ?? [];
    const recommended = Boolean(overlap && overlap.matchedSkills.length > 0);

    const explanation = exclusionReason
      ? exclusionReason
      : recommended
        ? `Listed in ${mycolSource.edition} as a critical occupation by TalentCorp. The reviewed mapping to O*NET ${mapping.onetSocCode} is ${relationText[mapping.relation]}. ${matchedSkills.length} of ${documented.length} skills O*NET documents for this occupation appear in your profile.`
        : `Listed in ${mycolSource.edition}, but none of the ${documented.length} skills O*NET documents for this occupation appear in your profile yet.`;

    return {
      id: `mycol-${mapping.masco4}`,
      mycol: { ...mycolOccupation, edition: mycolSource.edition },
      onet: {
        code: mapping.onetSocCode,
        title: onetOccupation.title,
        description: onetOccupation.description,
        url: `https://www.onetonline.org/link/summary/${mapping.onetSocCode}`,
        skillRatingsAvailable: onetOccupation.skills.length > 0,
        ratedSkillsCount: onetOccupation.skills.length,
      },
      mapping: { relation: mapping.relation, status: mapping.status, rationale: mapping.rationale, limitations: mapping.limitations },
      recommendationStatus: exclusionReason ? "excluded" as const : "eligible" as const,
      recommended,
      exclusionReason,
      documentedSkills: documented.map((s) => ({
        elementId: s.elementId,
        name: s.name,
        domain: s.domain,
        description: s.description,
        importance: s.importance.value,
        level: s.level.value,
        levelLowPrecision: s.level.recommendSuppress,
        sampleSize: s.importance.n,
        ratingDate: s.importance.date,
        inProfile: provided.has(normalizeSkill(s.name)),
      })),
      overlap: overlap ? { matchedSkills, missingSkills, skillsConsidered: overlap.skillsConsidered, score: overlap.score } : null,
      explanation,
    };
  });

  // Recommended occupations first (most matched documented skills), then the
  // remaining eligible ones, then exclusions; ties break by MASCO code.
  const rank = (o: (typeof occupations)[number]) => (o.recommended ? 0 : o.recommendationStatus === "eligible" ? 1 : 2);
  occupations.sort((a, b) =>
    rank(a) - rank(b) ||
    (b.overlap?.matchedSkills.length ?? 0) - (a.overlap?.matchedSkills.length ?? 0) ||
    (b.overlap?.score ?? 0) - (a.overlap?.score ?? 0) ||
    a.mycol.masco4.localeCompare(b.mycol.masco4));

  return { normalizedSkills: [...provided], occupations };
}
