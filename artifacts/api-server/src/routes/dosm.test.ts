import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../app";

let server: Server;
let base: string;

before(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/dosm`;
});

after(() => {
  server.close();
});

describe("DOSM data routes", () => {
  it("returns the reviewed Q1/Q2 snapshot with source and terms metadata", async () => {
    const response = await fetch(`${base}/job-market-insights`);
    assert.equal(response.status, 200);
    const json = await response.json() as any;
    assert.equal(json.datasetId, "dosm-jmi-major-groups-2026");
    assert.equal(json.reviewedAt, "2026-10-21");
    assert.equal(json.occupationGroups.length, 9);
    assert.equal(json.totalByQuarter[0].jobOfferings, 626861);
    assert.equal(json.totalByQuarter[1].jobOfferings, 555509);
    assert.ok(json.sourceUrl.startsWith("https://www.dosm.gov.my/"));
    assert.ok(json.termsUrl.includes("Terms-of-Use-Government-Open-Data"));
    assert.equal(
      json.occupationGroups.reduce(
        (sum: number, group: any) =>
          sum + group.observations.find((row: any) => row.quarter === "2026-Q1").jobOfferings,
        0,
      ),
      626861,
    );
    assert.equal(
      json.occupationGroups.reduce(
        (sum: number, group: any) =>
          sum + group.observations.find((row: any) => row.quarter === "2026-Q2").jobOfferings,
        0,
      ),
      555509,
    );
  });

  it("rejects invalid month filters before making an upstream request", async () => {
    const invalidMonth = await fetch(`${base}/labour-force?fromMonth=2026-13`);
    assert.equal(invalidMonth.status, 400);

    const reversedRange = await fetch(
      `${base}/labour-force?fromMonth=2026-09&toMonth=2026-08`,
    );
    assert.equal(reversedRange.status, 400);
  });
});
