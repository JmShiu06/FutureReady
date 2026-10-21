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

describe("skill learning recommendation endpoints", () => {
  const analysis = {
    technical_skills: ["Python", "SQL"],
    soft_skills: ["Communication"],
    missing_skills: ["Docker"],
    skill_scores: { Python: 85, SQL: 65, Docker: 20, Communication: 55 },
    candidate_level: "Intermediate",
    career_path: "Data Analyst",
  };

  it("recommends real catalog records from supplied analysis without storing user identifiers", async () => {
    const result = await post("/recommend-courses", { user_id: "user-123", analysis, limit: 8 });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.ok(result.json.recommended_courses.length <= 8);
    assert.ok(result.json.recommended_courses.length > 0);
    assert.ok(result.json.recommended_courses.every(
      (course: { course_name: string; course_url: string; match_score: number }) =>
        course.course_name && course.course_url.startsWith("https://") && course.match_score >= 0,
    ));
    assert.equal(result.json.dataset.record_count, 13783);
    assert.ok(!JSON.stringify(result.json).includes("user-123"));
    assert.ok(result.json.methodology.includes("lexical"));
  });

  it("creates weakest-skill-first monthly phases and accepts the existing analysis payload shape", async () => {
    const result = await post("/learning-roadmap", { analysis, courses_per_skill: 2 });
    assert.equal(result.status, 200);
    assert.deepEqual(
      result.json.roadmap.slice(0, 3).map((phase: { focus: string }) => phase.focus),
      ["Docker", "Communication", "SQL"],
    );
    assert.deepEqual(
      result.json.roadmap.slice(0, 3).map((phase: { month: number }) => phase.month),
      [1, 2, 3],
    );
    assert.ok(result.json.roadmap.every((phase: { courses: unknown[] }) => phase.courses.length <= 2));
  });

  it("rejects invalid analysis scores and handles empty gaps without inventing courses", async () => {
    const invalid = await post("/recommend-courses", { analysis: { skill_scores: { Python: 101 } } });
    assert.equal(invalid.status, 400);
    const empty = await post("/learning-roadmap", { analysis: {} });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.json.roadmap, []);
  });
});
