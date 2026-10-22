import { z } from "zod";
import rawTitles from "../data/cv_career_titles.json";
import { careerDataset, matchProfileSkills, SCORING, type CareerDataset } from "./careerMatcher";

// Only unique job_title values are imported. The CSV's binary skill flags,
// salary and openings are deliberately not treated as role requirements or DOSM evidence.
const titleReference = z.object({
  source: z.object({
    fileName: z.string().min(1), column: z.literal("job_title"),
    rowCount: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  careers: z.array(z.object({ title: z.string().min(1), skillRoleFamily: z.string().min(1) }).strict()).min(1),
}).strict().parse(rawTitles);

export const CV_CAREER_TITLE_REFERENCE = titleReference;
export const CV_CAREER_TITLE_NOTE =
  "Career names come from your uploaded AI Job Market Dataset (job_title only). " +
  "Skills and overlap scores use the existing 30-skill reference families, not the CSV skill flags. " +
  "AI Engineer, Machine Learning Engineer and Data Scientist share the pooled Data Scientist / ML reference, so equal scores are expected. " +
  "These are not title-specific requirements or Malaysian employment statistics; CSV salary and openings are not used.";

if (new Set(titleReference.careers.map(item => item.title)).size !== titleReference.careers.length) {
  throw new Error("CV career titles must be unique.");
}
const roles = titleReference.careers.map(({ title, skillRoleFamily }) => {
  const reference = careerDataset.roles.find(role => role.roleFamily === skillRoleFamily);
  if (!reference) throw new Error(`Missing CV career skill reference: ${skillRoleFamily}`);
  return { roleFamily: title, skills: [...reference.skills] };
});

/** Separate catalogue; never mutate or replace general-career or DOSM datasets. */
const cvDataset: CareerDataset = {
  roles,
  allSkills: [...new Set(roles.flatMap(role => role.skills))].sort((a, b) => a.localeCompare(b)),
  source: {
    ...careerDataset.source,
    measurementNote: `${careerDataset.source.measurementNote} ${CV_CAREER_TITLE_NOTE}`,
  },
};

export function matchCvCareerSkills(skills: string[]) {
  const result = matchProfileSkills(cvDataset, skills);
  return {
    ...result,
    matches: result.matches.map(match => ({
      ...match,
      skillRoleFamily: titleReference.careers.find(item => item.title === match.roleFamily)!.skillRoleFamily,
    })),
    scoring: { ...SCORING, note: `${SCORING.note} ${CV_CAREER_TITLE_NOTE}` },
    source: cvDataset.source,
  };
}
