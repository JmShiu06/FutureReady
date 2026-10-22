import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import app from "../app";
import { MatchCareersResponse } from "@workspace/api-zod";

let server: Server;
let base: string;
before(async () => {
  server = await new Promise<Server>(resolve => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

it("isolates uploaded career titles to the CV endpoint without changing the general endpoint", async () => {
  const post = (path: string) => fetch(`${base}/api/career/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills: ["Python", "SQL", "English"] }),
  });
  const scoped = await post("cv-match");
  assert.equal(scoped.status, 200);
  const result = MatchCareersResponse.parse(await scoped.json());
  const allowed = new Set(["AI Engineer", "Machine Learning Engineer", "Business Analyst", "Data Scientist", "Data Analyst", "Data Engineer"]);
  assert.equal(result.matches.length, 6);
  assert.ok(result.matches.every((match: { roleFamily: string; skillRoleFamily?: string }) => allowed.has(match.roleFamily) && match.skillRoleFamily));
  assert.equal(result.scoring.formula, "matched skills / 30 x 100");
  assert.match(result.source.measurementNote, /job_title only/);
  const general = await post("match");
  assert.equal(general.status, 200);
  assert.ok(MatchCareersResponse.parse(await general.json()).matches.some(match => match.roleFamily === "Backend"));
});

it("rejects invalid skills and returns honest empty results for no overlap", async () => {
  for (const skills of [[], [""], [12], Array(51).fill("python"), ["knitting"]]) {
    const response = await fetch(`${base}/api/career/cv-match`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills }),
    });
    assert.equal(response.status, skills[0] === "knitting" ? 200 : 400);
    if (response.ok) assert.deepEqual(MatchCareersResponse.parse(await response.json()).matches, []);
  }
});
