import assert from "node:assert/strict";
import test from "node:test";
import { dosmOccupationEmployment2024 } from "../data/dosm-occupation-employment-2024";
import { searchDosmOccupationEmployment } from "./occupation-employment-search";

test("DOSM employment counts reconcile to the 2024 national total", () => {
  const total = dosmOccupationEmployment2024.occupationGroups
    .reduce((sum, group) => sum + group.employedThousands, 0);

  assert.equal(Math.round(total * 10), Math.round(16_369.4 * 10));
  assert.equal(dosmOccupationEmployment2024.totalEmployedThousands, 16_369.4);
});

test("job-title keyword matches return only the broad DOSM occupation group", () => {
  const result = searchDosmOccupationEmployment(" Software Engineer ");

  assert.equal(result.query, "software engineer");
  assert.equal(result.occupationGroups.length, 1);
  assert.equal(result.occupationGroups[0].code, "2");
  assert.equal(result.occupationGroups[0].label, "Professionals");
  assert.equal(result.occupationGroups[0].employedThousands, 2_175.3);
  assert.deepEqual(result.occupationGroups[0].matchedOccupationTitles, ["Software Developers"]);
  assert.ok(result.occupationGroups[0].matchedJobTitles.includes("Software Engineer"));
});

test("group-name searches return the broad group and its reviewed title-index subset", () => {
  const result = searchDosmOccupationEmployment("professionals");

  assert.deepEqual(result.occupationGroups.map(group => group.code), ["2", "3"]);
  assert.ok(result.occupationGroups[0].matchedOccupationTitles.includes("Data Professionals"));
  assert.deepEqual(result.occupationGroups[0].matchedJobTitles, []);
  assert.equal(result.titleSearchSource.recordsInSearchIndex, 9);
});

test("unmatched keywords do not invent an occupation mapping", () => {
  assert.deepEqual(searchDosmOccupationEmployment("underwater basket weaver").occupationGroups, []);
});

test("an empty query returns the nine DOSM occupation groups", () => {
  assert.equal(searchDosmOccupationEmployment("").occupationGroups.length, 9);
});

test("occupation results include deterministic, sourced general group skills rather than title-specific requirements", () => {
  const titleGroup = searchDosmOccupationEmployment("Software Engineer").occupationGroups[0];
  const broadGroup = searchDosmOccupationEmployment("Professionals").occupationGroups[0];
  assert.ok(titleGroup.generalSkills.length > 0);
  assert.ok(titleGroup.generalSkills.length <= 8);
  assert.deepEqual(titleGroup.generalSkills, broadGroup.generalSkills);
  assert.equal(new Set(titleGroup.generalSkills).size, titleGroup.generalSkills.length);
  assert.ok(titleGroup.skillSourceUrls.every(url => url.startsWith("https://www.onetonline.org/")));
  assert.match(titleGroup.skillsCoverage, /not a requirement for every job/);
});

test("groups without reviewed skill mappings report unavailable evidence, not invented skills", () => {
  const group = searchDosmOccupationEmployment("").occupationGroups.find(group => group.code === "9")!;
  assert.deepEqual(group.generalSkills, []);
  assert.deepEqual(group.skillSourceUrls, []);
  assert.match(group.skillsCoverage, /No reviewed group-level skill evidence/);
});
