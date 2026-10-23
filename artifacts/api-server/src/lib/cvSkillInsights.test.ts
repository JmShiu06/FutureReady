import { it } from "node:test";
import assert from "node:assert/strict";
import { buildCvSkillInsights } from "./cvSkillInsights";

it("prioritises shared reference gaps without inflating pooled-title coverage", () => {
  const shared = { skillRoleFamily: "Pooled ML", matchedSkills: ["python"], missingSkills: ["sql", "statistics"] };
  const matches = [
    { ...shared, title: "AI Engineer" },
    { ...shared, title: "Machine Learning Engineer" },
    { ...shared, title: "Data Scientist" },
    { title: "Data Analyst", skillRoleFamily: "BI", matchedSkills: ["python"], missingSkills: ["sql", "communication"] },
  ];
  const before = JSON.stringify(matches);
  const result = buildCvSkillInsights(["python"], matches);
  assert.equal(result.priorityGaps[0].skill, "sql");
  assert.equal(result.priorityGaps[0].referenceFamilies.length, 2);
  assert.equal(result.priorityGaps[0].careerTitles.length, 4);
  assert.equal(result.allGaps.find(gap => gap.skill === "statistics")!.referenceFamilies.length, 1);
  assert.equal(JSON.stringify(matches), before);
  assert.match(result.priorityRule, /not a prerequisite order/);
});

it("ties use strongest existing family alignment, then stable alphabetical order", () => {
  const result = buildCvSkillInsights(["python", "sql"], [
    { title: "One", skillRoleFamily: "One", matchedSkills: ["python"], missingSkills: ["aaa"] },
    { title: "Two", skillRoleFamily: "Two", matchedSkills: ["python", "sql"], missingSkills: ["zzz", "bbb"] },
  ]);
  assert.deepEqual(result.priorityGaps.map(gap => gap.skill), ["bbb", "zzz", "aaa"]);
});

it("only forms combinations from selected skills and handles empty inputs", () => {
  assert.deepEqual(buildCvSkillInsights(["python"], []).patternGroups, []);
  const result = buildCvSkillInsights(["python", "sql", "communication"], []);
  assert.deepEqual(result.patternGroups, [{ theme: "Data work", skills: ["python", "sql"] }]);
  assert.deepEqual(buildCvSkillInsights([], []).priorityGaps, []);
});
