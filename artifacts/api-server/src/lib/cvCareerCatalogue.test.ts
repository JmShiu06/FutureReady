import { it } from "node:test";
import assert from "node:assert/strict";
import { careerDataset, matchProfileSkills } from "./careerMatcher";
import { matchCvCareerSkills, CV_CAREER_TITLE_REFERENCE } from "./cvCareerCatalogue";
import { prepareCvCareerExplanation } from "./cvCareerExplanation";

const titles = ["AI Engineer", "Machine Learning Engineer", "Business Analyst", "Data Scientist", "Data Analyst", "Data Engineer"];

it("uses exactly the uploaded unique career names with an explicit existing skill reference", () => {
  assert.deepEqual(CV_CAREER_TITLE_REFERENCE.careers.map(record => record.title).sort(), [...titles].sort());
  assert.equal(CV_CAREER_TITLE_REFERENCE.source.column, "job_title");
  for (const record of CV_CAREER_TITLE_REFERENCE.careers) {
    assert.ok(careerDataset.roles.some(role => role.roleFamily === record.skillRoleFamily));
  }
  assert.doesNotMatch(JSON.stringify(CV_CAREER_TITLE_REFERENCE), /salary|job_openings|skills_python/);
});

it("preserves reference skill lists, 30-skill scores, aliases, and general-career data", () => {
  const skills = ["Python", "SQL", "English", "Data storytelling"];
  const before = JSON.stringify(careerDataset);
  const original = matchProfileSkills(careerDataset, skills);
  const actual = matchCvCareerSkills(skills);
  assert.equal(actual.matches.length, 6);
  for (const match of actual.matches) {
    const reference = original.matches.find(role => role.roleFamily === match.skillRoleFamily)!;
    assert.equal(match.score, reference.score);
    assert.equal(match.skillsConsidered, 30);
    assert.deepEqual(match.matchedSkills, reference.matchedSkills);
    assert.deepEqual(match.missingSkills, reference.missingSkills);
  }
  assert.ok(actual.skillMappings.some(mapping => mapping.profileSkill === "Data storytelling" && mapping.matchType === "related"));
  const pooled = actual.matches.filter(match => match.skillRoleFamily === "Data Scientist / ML");
  assert.equal(new Set(pooled.map(match => match.score)).size, 1);
  assert.equal(JSON.stringify(careerDataset), before);
  assert.ok(original.matches.some(match => !titles.includes(match.roleFamily)));
  assert.match(actual.scoring.note, /share the pooled/);
  assert.deepEqual(matchCvCareerSkills(["not a listed skill"]).matches, []);
});

it("uses the same scoped career catalogue in AI context and authoritative result cards", () => {
  const prepared = prepareCvCareerExplanation({
    consent: true,
    data: { skills: ["python", "sql"], education: [], workExperience: [], certifications: [], projects: [], languages: [], extractionLimited: true },
  });
  assert.ok(prepared.matches.length > 0);
  assert.ok(prepared.matches.every(match => titles.includes(match.title)));
  assert.deepEqual(prepared.matches.map(match => match.title), matchCvCareerSkills(["python", "sql"]).matches.slice(0, 3).map(match => match.roleFamily));
  assert.deepEqual(prepared.request.context.matches.map(match => match.title), prepared.matches.map(match => match.title));
  assert.ok(prepared.warnings.some(warning => warning.includes("job_title only")));
  assert.equal("salary" in prepared.request.context, false);
});
