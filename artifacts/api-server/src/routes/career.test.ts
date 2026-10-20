import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../app";

let server: Server;
let base: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(() => {
  server.close();
});

async function post(body: unknown) {
  const res = await fetch(`${base}/career/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

describe("GET /api/career/skills", () => {
  it("lists dataset skills", async () => {
    const res = await fetch(`${base}/career/skills`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { skills: string[] };
    assert.ok(json.skills.includes("python"));
    assert.ok(json.skills.includes("node.js"));
    assert.ok(json.skills.includes("ci/cd"));
  });
});

describe("POST /api/career/match", () => {
  it("software-development profile", async () => {
    const { status, json } = await post({
      skills: ["Java", "Python", "Git", "Docker", "SQL", "AWS", "TypeScript"],
    });
    assert.equal(status, 200);
    // Backend, Full Stack and Software Engineer tie at 7/30; ties are alphabetical.
    assert.deepEqual(
      json.matches.slice(0, 3).map((m: any) => m.roleFamily),
      ["Backend", "Full Stack", "Software Engineer"],
    );
    for (const m of json.matches.slice(0, 3)) {
      assert.equal(m.score, 23.3);
      assert.equal(m.skillsConsidered, 30);
      assert.equal(m.matchedSkills.length, 7);
      assert.equal(m.missingSkills.length, 23);
    }
    assert.ok(json.matches[3].score < 23.3);
  });

  it("data-analysis profile", async () => {
    const { status, json } = await post({
      skills: ["Python", "SQL", "Excel", "Power BI"],
    });
    assert.equal(status, 200);
    assert.equal(json.matches[0].roleFamily, "Data Analyst / BI");
    assert.equal(json.matches[0].matchedSkills.length, 4);
    assert.equal(json.matches[0].score, 13.3);
  });

  it("includes source, citation and the overlap-not-probability explanation", async () => {
    const { json } = await post({ skills: ["python"] });
    assert.equal(json.source.publisher, "Qarera");
    assert.match(json.source.citation, /zenodo/i);
    assert.equal(json.scoring.formula, "matched skills / 30 x 100");
    assert.match(json.scoring.note, /not a probability of getting a job/i);
  });

  it("normalizes case, whitespace and duplicates", async () => {
    const { status, json } = await post({ skills: ["  PYTHON ", "python", "Power   BI"] });
    assert.equal(status, 200);
    assert.deepEqual(json.normalizedSkills, ["python", "power bi"]);
  });

  it("preserves punctuation and keeps unknown skills out of the matches", async () => {
    const { json } = await post({ skills: ["C++", "C#", "Node.js", "ci/cd"] });
    assert.deepEqual(json.unrecognizedSkills, ["c++", "c#"]);
    const allMatched = json.matches.flatMap((m: any) => m.matchedSkills);
    assert.ok(allMatched.includes("node.js"));
    assert.ok(allMatched.includes("ci/cd"));
  });

  it("does not match short skills by substring", async () => {
    const { json } = await post({ skills: ["ai"] });
    for (const m of json.matches) assert.deepEqual(m.matchedSkills, ["ai"]);
  });

  it("returns an empty match list (not an error) when nothing overlaps", async () => {
    const { status, json } = await post({ skills: ["knitting"] });
    assert.equal(status, 200);
    assert.deepEqual(json.matches, []);
    assert.deepEqual(json.unrecognizedSkills, ["knitting"]);
  });

  it("orders tied scores deterministically by role family", async () => {
    const { json } = await post({ skills: ["python"] });
    const tied = json.matches.filter((m: any) => m.score === json.matches[0].score);
    assert.ok(tied.length > 1, "expected tied roles for a single shared skill");
    const names = tied.map((m: any) => m.roleFamily);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  });

  it("rejects invalid input with 400", async () => {
    const bad: unknown[] = [
      {},
      { skills: "python" },
      { skills: [] },
      { skills: [42] },
      { skills: [null] },
      { skills: ["   ", ""] },
      { skills: ["x".repeat(61)] },
      { skills: Array.from({ length: 51 }, (_, i) => `skill${i}`) },
      null,
    ];
    for (const body of bad) {
      const { status, json } = await post(body);
      assert.equal(status, 400, JSON.stringify(body)?.slice(0, 60));
      assert.equal(typeof json.error, "string");
    }
  });
});
