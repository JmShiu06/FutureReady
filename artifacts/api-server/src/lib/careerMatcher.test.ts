import { describe, it } from "node:test";
import assert from "node:assert/strict";
import rawDataset from "../data/career_roles.json";
import {
  buildDataset,
  careerDataset,
  matchSkills,
  normalizeSkill,
  SKILLS_PER_ROLE,
} from "./careerMatcher";

/** Builds a minimal valid raw dataset where each role lists 30 skills. */
function syntheticRaw(roles: Record<string, string[]>) {
  const skillsFor = (name: string, own: string[]) => [
    ...own,
    ...Array.from({ length: SKILLS_PER_ROLE - own.length }, (_, i) => `${name}-filler-${i}`),
  ];
  return {
    intended_use: "test",
    matching_guidance: { caution: "test" },
    source: {
      dataset_name: "t",
      publisher: "t",
      dataset_period: "t",
      license: "t",
      citation: "t",
      source_urls: ["https://example.com"],
      geography_note: "t",
      measurement_note: "t",
    },
    skills_by_role: Object.entries(roles).map(([role_family, own]) => ({
      role_family,
      skills: skillsFor(role_family, own).map((skill) => ({ skill })),
    })),
  };
}

describe("normalizeSkill", () => {
  it("lower-cases, trims and collapses whitespace", () => {
    assert.equal(normalizeSkill("  Power   BI \t"), "power bi");
    assert.equal(normalizeSkill("PYTHON"), "python");
    assert.equal(normalizeSkill("Data\n Analysis"), "data analysis");
  });

  it("preserves meaningful punctuation", () => {
    assert.equal(normalizeSkill("Node.js"), "node.js");
    assert.equal(normalizeSkill("CI/CD"), "ci/cd");
    assert.equal(normalizeSkill(" C++ "), "c++");
    assert.equal(normalizeSkill("C#"), "c#");
    assert.notEqual(normalizeSkill("c++"), normalizeSkill("c"));
    assert.notEqual(normalizeSkill("node.js"), normalizeSkill("node"));
  });
});

describe("dataset loading", () => {
  it("loads the real dataset: 15 roles with exactly 30 skills each", () => {
    assert.equal(careerDataset.roles.length, 15);
    for (const role of careerDataset.roles) {
      assert.equal(role.skills.length, SKILLS_PER_ROLE, role.roleFamily);
    }
    assert.equal(careerDataset.source.publisher, "Qarera");
    assert.equal(careerDataset.source.license, "CC BY 4.0");
  });

  it("rejects a role that does not list exactly 30 skills", () => {
    const raw = syntheticRaw({ A: ["x"] });
    raw.skills_by_role[0].skills.pop();
    assert.throws(() => buildDataset(raw), /invalid/i);
  });

  it("rejects duplicate skills within a role (after normalization)", () => {
    const raw = syntheticRaw({ A: ["x", "X "] });
    assert.throws(() => buildDataset(raw), /duplicate/i);
  });

  it("rejects a dataset missing source information", () => {
    assert.throws(() => buildDataset({ skills_by_role: [] }), /invalid/i);
  });

  it("raw JSON import still validates", () => {
    assert.doesNotThrow(() => buildDataset(rawDataset));
  });
});

describe("matchSkills", () => {
  it("scores as matched / 30 x 100", () => {
    const ds = buildDataset(syntheticRaw({ A: ["a", "b", "c"] }));
    const { matches } = matchSkills(ds, ["a", "b", "c"]);
    assert.equal(matches[0].score, 10);
    assert.equal(matches[0].skillsConsidered, 30);
    const one = matchSkills(ds, ["a"]).matches[0];
    assert.equal(one.score, 3.3);
    assert.equal(one.matchedSkills.length + one.missingSkills.length, 30);
  });

  it("matches case-insensitively, ignores whitespace and duplicates", () => {
    const ds = buildDataset(syntheticRaw({ A: ["power bi", "node.js"] }));
    const result = matchSkills(ds, ["  POWER   bi", "Power BI", "NODE.JS", "   "]);
    assert.deepEqual(result.normalizedSkills, ["power bi", "node.js"]);
    assert.deepEqual(result.matches[0].matchedSkills, ["power bi", "node.js"]);
  });

  it("matches exact names only, never substrings", () => {
    const ds = buildDataset(syntheticRaw({ A: ["ai", "ai/ml", "node.js", "c++"] }));
    const ai = matchSkills(ds, ["ai"]).matches[0];
    assert.deepEqual(ai.matchedSkills, ["ai"]);
    assert.ok(ai.missingSkills.includes("ai/ml"));
    assert.equal(matchSkills(ds, ["a"]).matches.length, 0);
    assert.equal(matchSkills(ds, ["mail"]).matches.length, 0);
    assert.equal(matchSkills(ds, ["node"]).matches.length, 0);
    assert.equal(matchSkills(ds, ["c"]).matches.length, 0);
    assert.deepEqual(matchSkills(ds, ["C++"]).matches[0].matchedSkills, ["c++"]);
  });

  it("reports unrecognized skills without matching them", () => {
    const result = matchSkills(careerDataset, ["Python", "Underwater Basket Weaving"]);
    assert.deepEqual(result.unrecognizedSkills, ["underwater basket weaving"]);
  });

  it("breaks tied scores alphabetically by role family, deterministically", () => {
    const ds = buildDataset(syntheticRaw({ Zeta: ["s"], Alpha: ["s"], Mid: ["s"], Other: ["t"] }));
    const first = matchSkills(ds, ["s"]).matches.map((m) => m.roleFamily);
    assert.deepEqual(first, ["Alpha", "Mid", "Zeta"]);
    assert.deepEqual(matchSkills(ds, ["s"]).matches.map((m) => m.roleFamily), first);
  });

  it("orders by score first, then by role family", () => {
    const ds = buildDataset(syntheticRaw({ A: ["x"], B: ["x", "y"], C: ["x", "y"] }));
    const order = matchSkills(ds, ["x", "y"]).matches.map((m) => [m.roleFamily, m.score]);
    assert.deepEqual(order, [["B", 6.7], ["C", 6.7], ["A", 3.3]]);
  });

  it("software-development profile ranks software roles first, ties alphabetical (real dataset)", () => {
    const { matches } = matchSkills(careerDataset, [
      "Java", "Python", "Git", "Docker", "SQL", "AWS", "TypeScript",
    ]);
    assert.ok(matches.length > 0);
    // Backend, Full Stack and Software Engineer all list these 7 skills, so
    // they tie at 23.3 and are ordered alphabetically.
    assert.deepEqual(
      matches.slice(0, 3).map((m) => m.roleFamily),
      ["Backend", "Full Stack", "Software Engineer"],
    );
    assert.ok(matches.slice(0, 3).every((m) => m.score === 23.3));
    assert.ok(matches[3].score < 23.3);
    const se = matches.find((m) => m.roleFamily === "Software Engineer")!;
    assert.deepEqual(
      [...se.matchedSkills].sort(),
      ["aws", "docker", "git", "java", "python", "sql", "typescript"],
    );
    assert.equal(se.score, 23.3);
  });

  it("data-analysis profile ranks Data Analyst / BI first (real dataset)", () => {
    const { matches } = matchSkills(careerDataset, [
      "SQL", "Excel", "Power BI", "Tableau", "Python", "Data Visualization", "Statistics",
    ]);
    assert.equal(matches[0].roleFamily, "Data Analyst / BI");
    assert.equal(matches[0].matchedSkills.length, 7);
    assert.equal(matches[0].score, 23.3);
    const software = matches.find((m) => m.roleFamily === "Software Engineer");
    assert.ok(!software || software.score < matches[0].score);
  });

  it("returns no matches when nothing overlaps", () => {
    const { matches, unrecognizedSkills } = matchSkills(careerDataset, ["knitting"]);
    assert.equal(matches.length, 0);
    assert.deepEqual(unrecognizedSkills, ["knitting"]);
  });
});
