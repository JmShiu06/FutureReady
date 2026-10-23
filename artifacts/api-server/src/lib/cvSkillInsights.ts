type ReferenceMatch = {
  title: string;
  skillRoleFamily: string;
  matchedSkills: string[];
  missingSkills: string[];
};

/**
 * Explanation facts only: never feed these priorities back into career scores.
 * Count distinct reference families, not titles sharing the same reference.
 * No prerequisites or role-specific hiring requirements are inferred here.
 */
export function buildCvSkillInsights(skills: string[], matches: ReferenceMatch[]) {
  const families = [...new Map(matches.map(match => [match.skillRoleFamily, match])).values()];
  const gaps = [...new Set(families.flatMap(match => match.missingSkills))].map(skill => {
    const references = families.filter(match => match.missingSkills.includes(skill));
    return {
      skill,
      referenceFamilies: references.map(match => match.skillRoleFamily),
      careerTitles: matches.filter(match => match.missingSkills.includes(skill)).map(match => match.title),
      strongestExistingAlignment: Math.max(...references.map(match => match.matchedSkills.length)),
    };
  }).sort((a, b) =>
    b.referenceFamilies.length - a.referenceFamilies.length ||
    b.strongestExistingAlignment - a.strongestExistingAlignment ||
    a.skill.localeCompare(b.skill));
  const patternGroups = [
    { theme: "Data work", candidates: ["python", "sql", "pandas", "excel", "data analysis", "data analytics", "statistics", "data visualization", "power bi", "tableau"] },
    { theme: "Software delivery", candidates: ["python", "javascript", "typescript", "java", "git", "testing", "debugging", "rest apis", "ci/cd", "docker"] },
    { theme: "Analytical reasoning", candidates: ["analytical", "analytical skills", "statistics", "business analysis", "data interpretation", "problem solving", "research"] },
    { theme: "Communicating and coordinating", candidates: ["communication", "communication and collaboration", "collaboration", "documentation", "stakeholder management", "leadership", "project management"] },
  ].map(({ theme, candidates }) => ({ theme, skills: skills.filter(skill => candidates.includes(skill)) }))
    .filter(group => group.skills.length >= 2);
  return {
    patternGroups,
    evidenceLimit: skills.length < 3
      ? "Limited input: explore a tentative combination only if supported; ask for a project example locally, not additional personal data to send."
      : "Skill names show reported coverage only; projects, work quality, proficiency and qualifications are unavailable.",
    priorityRule: "First: gaps shared across distinct supplied reference families. Then: gaps in the family with most existing skill overlap. Alphabetical tie-break only, not a prerequisite order. Titles sharing a reference do not add weight.",
    priorityGaps: gaps.slice(0, 5),
    allGaps: gaps,
  };
}
