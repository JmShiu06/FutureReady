import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

export interface SkillAnalysis {
  technical_skills?: string[];
  soft_skills?: string[];
  missing_skills?: string[];
  skill_scores?: Record<string, number>;
  candidate_level?: string;
  career_path?: string;
  [key: string]: unknown;
}

interface CourseRecord {
  id: string;
  title: string;
  provider: string;
  provider_key: string;
  url: string;
  kind: string;
  skills: string[];
  level: string;
  rating: number | null;
  duration_value: number | null;
  description: string;
}

export type CourseDifficulty = "Beginner" | "Intermediate" | "Advanced" | "Unknown";
export type RecommendationType = "technical" | "soft_skill" | "career_development";

export interface RecommendedCourse {
  course_name: string;
  platform: string;
  course_type: string;
  difficulty: CourseDifficulty;
  skills_covered: string[];
  recommendation_type: RecommendationType;
  matched_skills: string[];
  match_score: number;
  rating: number | null;
  duration_value: number | null;
  duration_note: string;
  course_url: string;
}

export const courseDatasetMetadata = {
  name: "User-supplied combined Coursera and edX course dataset",
  record_count: 13783,
  providers: ["Coursera", "edX"],
  provenance: "Normalized from the attached combined_dataset.json; source archive dated April 11, 2025.",
  verification: "Dataset references only. Course URLs, current availability, ratings, pricing, and licensing were not independently verified.",
} as const;

const methodology =
  "Deterministic catalog matching: exact course skill tags receive the strongest relevance, then skill-phrase overlap and title/description token overlap. Scores also consider score-derived difficulty, supplied rating when present, and a low-score sequence preference. This is not a sentence-transformer embedding model or a validated learning outcome.";
const limitations = [
  "This endpoint consumes skill-analysis output and does not analyze CV text or alter the existing skill-analysis engine.",
  "The supplied dataset contains course skills, titles, descriptions, mixed difficulty labels, sparse ratings, and duration values with inconsistent units.",
  "Dataset URLs, course availability, ratings, certifications, cost, and licensing have not been independently verified.",
  "The dataset has no validated learning outcomes, learner prerequisites, or prerequisite chains; roadmap order is an estimate based on reported skill scores.",
  "No PostgreSQL or vector-database records are created. The supplied catalog is bundled as a read-only compressed data file.",
];
const DURATION_NOTE =
  "Source duration value shown without converting to hours because the dataset does not define a consistent unit.";

const normalize = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase().replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const stopWords = new Set(["a", "an", "and", "are", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"]);
const tokens = (text: string) =>
  normalize(text).split(/\s+/).filter((word) => word.length > 1 && !stopWords.has(word));

function readCatalog(): CourseRecord[] {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "../data/skill_learning_catalog.json.gz"),
    path.resolve(moduleDir, "data/skill_learning_catalog.json.gz"),
  ];
  const file = candidates.find(existsSync);
  if (!file) throw new Error("The bundled skill-learning course catalog could not be found.");
  const parsed: unknown = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
  if (!Array.isArray(parsed)) throw new Error("The bundled skill-learning course catalog is invalid.");
  return parsed as CourseRecord[];
}

let cachedCourses: CourseRecord[] | undefined;
export function getCourseCatalog(): readonly CourseRecord[] {
  cachedCourses ??= readCatalog();
  return cachedCourses;
}

function scoreFor(analysis: SkillAnalysis, skill: string): number {
  const key = normalize(skill);
  const entry = Object.entries(analysis.skill_scores ?? {}).find(([name]) => normalize(name) === key);
  if (entry) return entry[1];
  const candidateLevel = normalize(analysis.candidate_level ?? "");
  if (candidateLevel.includes("advanced") || candidateLevel.includes("senior")) return 85;
  if (candidateLevel.includes("intermediate") || candidateLevel.includes("mid")) return 70;
  return 0;
}

export function difficultyFor(score: number): Exclude<CourseDifficulty, "Unknown"> {
  if (score < 60) return "Beginner";
  if (score <= 80) return "Intermediate";
  return "Advanced";
}

function courseDifficulty(level: string, expected: string): CourseDifficulty {
  const value = normalize(level);
  if (value === "beginner" || value === "introductory") return "Beginner";
  if (value === "intermediate") return "Intermediate";
  if (value === "advanced") return "Advanced";
  if (value.includes(normalize(expected))) return expected as Exclude<CourseDifficulty, "Unknown">;
  return "Unknown";
}

function phraseRelevance(query: string, value: string): number {
  const q = normalize(query);
  const v = normalize(value);
  if (!q || !v) return 0;
  if (q === v || v.includes(q) || q.includes(v)) return 1;
  const qTokens = new Set(tokens(query));
  const vTokens = new Set(tokens(value));
  if (!qTokens.size || !vTokens.size) return 0;
  const intersection = [...qTokens].filter((word) => vTokens.has(word)).length;
  const recall = intersection / qTokens.size;
  const precision = intersection / vTokens.size;
  const overlap = 2 * recall * precision / (recall + precision || 1);
  // One shared generic term should not make two unrelated multi-word concepts a strong match.
  return qTokens.size === 1 ? overlap * 0.6 : overlap;
}

function recommendationType(
  skill: string,
  technical: Set<string>,
  soft: Set<string>,
): RecommendationType {
  const key = normalize(skill);
  if (soft.has(key)) return "soft_skill";
  if (technical.has(key)) return "technical";
  return "career_development";
}

interface SkillPriority {
  name: string;
  score: number;
  missing: boolean;
  type: RecommendationType;
}

function skillPriorities(analysis: SkillAnalysis): SkillPriority[] {
  const technical = new Set((analysis.technical_skills ?? []).map(normalize));
  const soft = new Set((analysis.soft_skills ?? []).map(normalize));
  const allScored = Object.entries(analysis.skill_scores ?? {});
  const missing = new Set((analysis.missing_skills ?? []).map(normalize));
  const selected = new Map<string, SkillPriority>();
  for (const skill of [...(analysis.missing_skills ?? []), ...allScored.filter(([, score]) => score <= 80).map(([skill]) => skill)]) {
    const key = normalize(skill);
    if (!key) continue;
    const score = scoreFor(analysis, skill);
    const existing = selected.get(key);
    selected.set(key, {
      name: existing?.name ?? skill.trim(),
      score: Math.min(existing?.score ?? score, score),
      missing: missing.has(key) || !!existing?.missing,
      type: recommendationType(skill, technical, soft),
    });
  }
  return [...selected.values()].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
}

function catalogCourseRelevance(course: CourseRecord, skill: string): number {
  const tagScore = Math.max(0, ...course.skills.map((tag) => phraseRelevance(skill, tag)));
  if (tagScore >= 0.55) return Math.min(1, 0.72 + tagScore * 0.28);
  const queryWords = new Set(tokens(skill));
  if (!queryWords.size) return 0;
  const content = `${course.title} ${course.description}`;
  const contentWords = new Set(tokens(content));
  const shared = [...queryWords].filter((word) => contentWords.has(word)).length;
  return Math.min(0.55, shared / queryWords.size * 0.55);
}

interface ScoredCourse {
  row: CourseRecord;
  priority: SkillPriority;
  relevance: number;
  score: number;
  difficulty: CourseDifficulty;
  matchedSkills: string[];
}

interface CatalogIndex {
  postings: Map<string, number[]>;
  exactTags: Map<string, number[]>;
}
const indexCache = new WeakMap<readonly CourseRecord[], CatalogIndex>();
function catalogIndex(catalog: readonly CourseRecord[]): CatalogIndex {
  const cached = indexCache.get(catalog);
  if (cached) return cached;
  const postings = new Map<string, number[]>();
  const exactTags = new Map<string, number[]>();
  catalog.forEach((course, index) => {
    const documentTerms = new Set(tokens(`${course.title} ${course.description} ${course.skills.join(" ")}`));
    for (const term of documentTerms) {
      const list = postings.get(term) ?? [];
      list.push(index);
      postings.set(term, list);
    }
    for (const skill of course.skills) {
      const key = normalize(skill);
      const list = exactTags.get(key) ?? [];
      list.push(index);
      exactTags.set(key, list);
    }
  });
  const built = { postings, exactTags };
  indexCache.set(catalog, built);
  return built;
}

function candidatesForSkill(skill: string, index: CatalogIndex, total: number): Map<number, number> {
  const words = [...new Set(tokens(skill))];
  const sharedCounts = new Map<number, number>();
  // Broad terms produce noise; exact course tags remain eligible regardless of term frequency.
  for (const word of words) {
    const documents = index.postings.get(word) ?? [];
    if (documents.length > total * 0.3) continue;
    for (const doc of documents) sharedCounts.set(doc, (sharedCounts.get(doc) ?? 0) + 1);
  }
  const result = new Map<number, number>();
  for (const [doc, count] of sharedCounts) {
    let relevance = count / Math.max(1, words.length);
    if (words.length === 1) relevance *= 0.6;
    if (relevance >= 0.35) result.set(doc, relevance);
  }
  for (const doc of index.exactTags.get(normalize(skill)) ?? []) {
    result.set(doc, 1);
  }
  // A related but non-identical skill tag is stronger evidence than a description-only token overlap.
  return result;
}

function scoreCourses(analysis: SkillAnalysis, catalog = getCourseCatalog()): ScoredCourse[] {
  const priorities = skillPriorities(analysis);
  const index = catalogIndex(catalog);
  const candidates = new Map<number, { skill: SkillPriority; relevance: number }[]>();
  for (const priority of priorities) {
    for (const [doc, relevance] of candidatesForSkill(priority.name, index, catalog.length)) {
      const matches = candidates.get(doc) ?? [];
      matches.push({ skill: priority, relevance });
      candidates.set(doc, matches);
    }
  }
  const careerPath = analysis.career_path?.trim();
  if (careerPath) {
    for (const [doc, relevance] of candidatesForSkill(careerPath, index, catalog.length)) {
      if (relevance < 0.55) continue;
      const matches = candidates.get(doc) ?? [];
      matches.push({
        skill: { name: careerPath, score: 0, missing: false, type: "career_development" },
        relevance,
      });
      candidates.set(doc, matches);
    }
  }

  return [...candidates.entries()].map(([doc, matches]) => {
    const row = catalog[doc];
    const best = [...matches].sort((a, b) => b.relevance - a.relevance || a.skill.score - b.skill.score)[0];
    const expected = difficultyFor(best.skill.score);
    const difficulty = courseDifficulty(row.level, expected);
    const difficultyPoints = difficulty === expected ? 15 : difficulty === "Unknown" ? 7 : 5;
    const ratingPoints = row.rating === null ? 5 : row.rating / 5 * 10;
    const score = Math.round(
      Math.min(70, best.relevance * 70) +
      difficultyPoints +
      ratingPoints +
      Math.min(5, (100 - best.skill.score) / 20),
    );
    return {
      row,
      priority: best.skill,
      relevance: best.relevance,
      score: Math.min(100, score),
      difficulty,
      matchedSkills: [...new Set(matches.map((match) => match.skill.name))],
    };
  }).sort((a, b) =>
    b.score - a.score || a.priority.score - b.priority.score || a.row.title.localeCompare(b.row.title),
  );
}

function publicCourse(item: ScoredCourse): RecommendedCourse {
  return {
    course_name: item.row.title,
    platform: item.row.provider || item.row.provider_key,
    course_type: item.row.kind || "course",
    difficulty: item.difficulty,
    skills_covered: item.row.skills,
    recommendation_type: item.priority.type,
    matched_skills: item.matchedSkills,
    match_score: item.score,
    rating: item.row.rating,
    duration_value: item.row.duration_value,
    duration_note: DURATION_NOTE,
    course_url: item.row.url,
  };
}

export interface CourseRecommendations {
  recommended_courses: RecommendedCourse[];
  methodology: string;
  limitations: string[];
  dataset: typeof courseDatasetMetadata;
}

export function recommendCourses(
  analysis: SkillAnalysis,
  limit = 20,
  catalog = getCourseCatalog(),
): CourseRecommendations {
  return {
    recommended_courses: scoreCourses(analysis, catalog).slice(0, limit).map(publicCourse),
    methodology,
    limitations,
    dataset: courseDatasetMetadata,
  };
}

export interface LearningRoadmap {
  roadmap: {
    month: number;
    focus: string;
    skills: string[];
    courses: RecommendedCourse[];
    duration_estimate: string;
  }[];
  methodology: string;
  limitations: string[];
  dataset: typeof courseDatasetMetadata;
}

export function generateLearningRoadmap(
  analysis: SkillAnalysis,
  coursesPerSkill = 3,
  catalog = getCourseCatalog(),
): LearningRoadmap {
  const priorities = skillPriorities(analysis);
  const allRanked = scoreCourses(analysis, catalog);
  const roadmap = priorities.map((priority, index) => {
    const matches = allRanked.filter((item) => item.matchedSkills.includes(priority.name));
    return {
      month: index + 1,
      focus: priority.name,
      skills: [priority.name],
      courses: matches.slice(0, coursesPerSkill).map(publicCourse),
      duration_estimate: "Estimated planning block: one month per priority skill; course duration units are not normalized in the source dataset.",
    };
  });
  return { roadmap, methodology, limitations, dataset: courseDatasetMetadata };
}
