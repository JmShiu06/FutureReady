import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../app";

let server: Server;
let url: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/occupations/match`;
});

after(() => {
  server.close();
});

const post = (body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("POST /api/occupations/match", () => {
  it("returns sourced evidence for a fictional profile", async () => {
    const response = await post({ skills: ["Critical thinking", "Active listening", "Programming"] });
    assert.equal(response.status, 200);
    const json = (await response.json()) as any;
    assert.equal(json.sources.mycol.edition, "MyCOL 2024/2025");
    assert.equal(json.sources.onet.release, "31.0");
    assert.match(json.sources.onet.attribution, /CC BY 4\.0/);
    assert.match(json.selectionRule, /SkillShift selection rule/);
    assert.match(json.scoring, /not personal proficiency readiness/);
    const developer = json.occupations.find((o: any) => o.mycol.masco4 === "2512");
    assert.equal(developer.onet.code, "15-1252.00");
    assert.equal(developer.onet.url, "https://www.onetonline.org/link/summary/15-1252.00");
    assert.equal(developer.recommended, true);
    assert.ok(developer.overlap.matchedSkills.includes("Programming"));
    assert.equal(json.occupations.find((o: any) => o.mycol.masco4 === "2431").recommended, false);
  });

  it("accepts an empty profile and recommends nothing", async () => {
    const response = await post({ skills: [] });
    assert.equal(response.status, 200);
    const json = (await response.json()) as any;
    assert.equal(json.occupations.some((o: any) => o.recommended), false);
    assert.equal(json.occupations.length, 9);
  });

  it("rejects invalid skill input", async () => {
    assert.equal((await post({ skills: ["x".repeat(61)] })).status, 400);
    assert.equal((await post({ skills: Array.from({ length: 51 }, (_, i) => `s${i}`) })).status, 400);
    assert.equal((await post({ skills: "Programming" })).status, 400);
    assert.equal((await post({})).status, 400);
  });
});
