import { it } from "node:test";
import assert from "node:assert/strict";
import { buildCvCareerData, categorizeCvSkill, redactCvContacts } from "./cvCareerData";

it("extracts only headed CV facts and removes obvious contact data", () => {
  const text = `Synthetic Candidate
candidate@example.test
Name: Synthetic Candidate
Education
Diploma in Information Systems, 2020-2022
Work Experience
Built Python scripts for reporting.
Email: manager@example.test
Telephone: +60 123 456 7890
Projects
Inventory dashboard using SQL.
Certifications: Sample training statement from CV
Languages
English and Malay
Skills
python, sql
References
Reference private details`;
  const result = buildCvCareerData(text, ["python", "sql"]);
  assert.deepEqual(result.skills, ["python", "sql"]);
  assert.deepEqual(result.education, ["Diploma in Information Systems, 2020-2022"]);
  assert.deepEqual(result.workExperience, ["Built Python scripts for reporting."]);
  assert.deepEqual(result.certifications, ["Sample training statement from CV"]);
  assert.deepEqual(result.projects, ["Inventory dashboard using SQL."]);
  assert.deepEqual(result.languages, ["English and Malay"]);
  assert.equal(result.extractionLimited, true);
  assert.doesNotMatch(JSON.stringify(result), /example\.test|123 456|Synthetic Candidate|private details/);
  assert.equal("text" in result, false);
});

it("never invents missing education, experience, certification or project information", () => {
  assert.deepEqual(buildCvCareerData("Python SQL", ["python", "sql"]), {
    skills: ["python", "sql"], education: [], workExperience: [], certifications: [], projects: [], languages: [], extractionLimited: true,
  });
  assert.match(redactCvContacts("Contact me at cv@example.test or +60 1234567890"), /\[contact removed\]/);
  assert.equal(redactCvContacts("Worked 2019-2024"), "Worked 2019-2024");
  assert.equal(categorizeCvSkill("python"), "Technical Skills");
  assert.equal(categorizeCvSkill("teamwork"), "Soft Skills");
  assert.equal(categorizeCvSkill("English"), "Languages");
});
