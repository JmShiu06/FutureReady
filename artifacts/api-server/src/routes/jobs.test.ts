import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { GetJobResponse } from "@workspace/api-zod";
import app from "../app";

let server: Server;
let base: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/jobs`;
});

after(() => {
  server.close();
});

describe("GET /api/jobs", () => {
  it("returns a paginated page of explicitly labeled demo listings", async () => {
    const response = await fetch(`${base}?page=1&limit=2`);
    assert.equal(response.status, 200);
    const json = (await response.json()) as any;
    assert.equal(json.page, 1);
    assert.equal(json.limit, 2);
    assert.equal(json.jobs.length, 2);
    assert.equal(json.total, 8);
    assert.ok(json.jobs.every((job: any) => job.demo === true));
    assert.ok(json.jobs.every((job: any) => job.externalUrl === null));
    assert.match(json.jobs[0].datePosted, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("filters by location, employment type, remote status and salary", async () => {
    const response = await fetch(
      `${base}/filter?state=Johor&employmentType=part-time&remote=false&minSalary=2000`,
    );
    assert.equal(response.status, 200);
    const json = (await response.json()) as any;
    assert.ok(json.jobs.length > 0);
    assert.ok(
      json.jobs.every(
        (job: any) =>
          job.state === "Johor" &&
          job.employmentType === "part-time" &&
          job.remote === false &&
          job.salaryMin >= 2000,
      ),
    );
  });

  it("supports keyword search over title, company, and skills", async () => {
    const response = await fetch(`${base}/search?q=python&sort=relevance`);
    assert.equal(response.status, 200);
    const json = (await response.json()) as any;
    assert.ok(json.jobs.length > 0);
    assert.ok(
      json.jobs.every((job: any) =>
        [job.title, job.company, ...job.requiredSkills]
          .join(" ")
          .toLowerCase()
          .includes("python"),
      ),
    );
  });

  it("rejects invalid paging and filter values", async () => {
    for (const query of ["page=0", "limit=51", "remote=sometimes", "employmentType=casual"]) {
      const response = await fetch(`${base}?${query}`);
      assert.equal(response.status, 400, query);
      assert.equal(typeof ((await response.json()) as any).error, "string");
    }
  });
});

describe("GET /api/jobs/:id", () => {
  it("returns details and a 404 for unknown jobs", async () => {
    const found = await fetch(`${base}/demo-data-analyst`);
    assert.equal(found.status, 200);
    const job = (await found.json()) as any;
    assert.equal(job.requiredSkills.length, 6);
    assert.equal(job.demo, true);

    const missing = await fetch(`${base}/not-a-real-job`);
    assert.equal(missing.status, 404);
    assert.equal(typeof ((await missing.json()) as any).error, "string");
  });

  it("only permits HTTP(S) external application URLs in the API contract", async () => {
    const response = await fetch(`${base}/demo-data-analyst`);
    const job = (await response.json()) as Record<string, unknown>;
    assert.equal(
      GetJobResponse.safeParse({ ...job, externalUrl: "https://jobs.example.org/apply" }).success,
      true,
    );
    assert.equal(
      GetJobResponse.safeParse({ ...job, externalUrl: "javascript:alert(1)" }).success,
      false,
    );
  });
});

describe("POST /api/jobs/match-score", () => {
  it("calculates exact, normalized profile-skill overlap", async () => {
    const response = await fetch(`${base}/match-score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        candidateSkills: [" sql ", "PYTHON", "Data Analysis", "power   bi"],
        jobIds: ["demo-data-analyst"],
      }),
    });
    assert.equal(response.status, 200);
    const json = (await response.json()) as any;
    assert.equal(json.scores.length, 1);
    assert.equal(json.scores[0].score, 67);
    assert.deepEqual(json.scores[0].matchedSkills, ["SQL", "Python", "Power BI", "Data Analysis"]);
    assert.deepEqual(json.scores[0].missingSkills, ["Excel", "Communication"]);
    assert.match(json.scoringNote, /not a probability/i);
  });

  it("rejects empty/invalid candidate skills", async () => {
    for (const body of [{ candidateSkills: [] }, { candidateSkills: [4] }, {}]) {
      const response = await fetch(`${base}/match-score`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
    }
  });
});
