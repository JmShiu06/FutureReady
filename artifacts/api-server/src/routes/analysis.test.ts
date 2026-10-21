import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../app";

let server: Server;
let base: string;

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(() => server.close());

async function post(path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    headers: response.headers,
    json: await response.json() as Record<string, any>,
  };
}

const resumeText = [
  "Skills: Python, SQL, Docker",
  "Current Role: Backend developer",
  "Years of Experience: 4 years",
].join("\n");

describe("resume skill analysis endpoints", () => {
  it("detects dataset skills locally and returns no fabricated readiness score", async () => {
    const result = await post("/analyze-resume", { resume_text: resumeText });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.deepEqual(result.json.recognized_skills, ["python", "sql", "docker"]);
    assert.equal(result.json.profile_suggestions.occupation, "Backend developer");
    assert.equal(result.json.profile_suggestions.experienceYears, 4);
    assert.equal(result.json.skill_score, null);
    assert.equal(result.json.candidate_level, null);
    assert.deepEqual(result.json.similar_profiles, []);
    assert.ok(result.json.limitations.some((item: string) => item.includes("taxonomy")));
    assert.ok(!JSON.stringify(result.json).includes(resumeText));
  });

  it("uses the existing matcher for role-specific gaps, including zero-overlap roles", async () => {
    const result = await post("/skill-gap-analysis", {
      resume_text: resumeText,
      target_role: "Backend",
    });
    assert.equal(result.status, 200);
    assert.equal(result.json.target_role, "Backend");
    assert.deepEqual(result.json.current_skills, ["python", "docker", "sql"]);
    assert.equal(result.json.missing_skills.length, 27);
    assert.equal(result.json.overlap_score, 10);
    assert.deepEqual(result.json.recommended_courses, []);
    assert.equal(result.json.estimated_learning_time, null);

    const noOverlap = await post("/skill-gap-analysis", {
      resume_text: "Skills: knitting",
      target_role: "Backend",
    });
    assert.equal(noOverlap.status, 200);
    assert.equal(noOverlap.json.overlap_score, 0);
    assert.equal(noOverlap.json.missing_skills.length, 30);
  });

  it("ranks career paths deterministically and marks growth skills illustrative", async () => {
    const result = await post("/career-path", { resume_text: resumeText });
    assert.equal(result.status, 200);
    assert.equal(result.json.suitable_roles[0].roleFamily, "Backend");
    assert.ok(result.json.suitable_roles[0].score > 0);
    assert.ok(result.json.growth_path.length > 0);
    assert.ok(result.json.limitations.some((item: string) => item.includes("not a predicted")));
  });

  it("does not invent similar candidate profiles or peer data", async () => {
    const result = await post("/profile-similarity", { resume_text: resumeText });
    assert.equal(result.status, 200);
    assert.deepEqual(result.json.similar_profiles, []);
    assert.deepEqual(result.json.common_skills, []);
    assert.ok(result.json.limitations.some((item: string) => item.includes("No candidate-profile")));
  });

  it("validates request bodies and target role names", async () => {
    for (const body of [{}, { resume_text: " " }, { resume_text: "x".repeat(200_001) }]) {
      const result = await post("/analyze-resume", body);
      assert.equal(result.status, 400);
      assert.equal(typeof result.json.error, "string");
    }
    const unknownRole = await post("/skill-gap-analysis", {
      resume_text: resumeText,
      target_role: "Not a bundled role",
    });
    assert.equal(unknownRole.status, 404);
  });
});
