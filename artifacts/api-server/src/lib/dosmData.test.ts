import assert from "node:assert/strict";
import test from "node:test";
import {
  createDosmLabourForceService,
  parseOpenDosmLabourForcePayload,
} from "./dosmData";

const sampleRecords = [
  {
    date: "2026-07-01",
    lf: 18000,
    p_rate: 70.1,
    u_rate: 3.2,
    ep_ratio: 67.8,
    lf_outside: 7700,
    lf_employed: 17424,
    lf_unemployed: 576,
  },
  {
    date: "2026-08-01",
    lf: 18100,
    p_rate: 70.2,
    u_rate: 3.1,
    ep_ratio: 68,
    lf_outside: 7680,
    lf_employed: 17539,
    lf_unemployed: 561,
  },
];

test("validates and normalizes OpenDOSM monthly records", () => {
  const parsed = parseOpenDosmLabourForcePayload(sampleRecords);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[1]?.date, "2026-08-01");
  assert.equal(parsed[1]?.unemploymentRate, 3.1);
  assert.equal(parsed[1]?.labourForceThousands, 18100);
  assert.equal(parsed[1]?.publicationDate, null);
});

test("rejects invalid dates, percentages, negative counts and duplicate months", () => {
  assert.throws(
    () => parseOpenDosmLabourForcePayload([{ ...sampleRecords[0], date: "2026-02-30" }]),
    /failed validation|invalid observation date/,
  );
  assert.throws(
    () => parseOpenDosmLabourForcePayload([{ ...sampleRecords[0], u_rate: 101 }]),
    /failed validation/,
  );
  assert.throws(
    () => parseOpenDosmLabourForcePayload([{ ...sampleRecords[0], lf_unemployed: -1 }]),
    /failed validation/,
  );
  assert.throws(
    () => parseOpenDosmLabourForcePayload([sampleRecords[0], sampleRecords[0]]),
    /duplicate monthly observations/,
  );
  assert.throws(() => parseOpenDosmLabourForcePayload([]), /empty or oversized/);
});

test("caches successful source results and refreshes on explicit request", async () => {
  let requestCount = 0;
  let now = new Date("2026-10-21T00:00:00.000Z");
  const service = createDosmLabourForceService({
    now: () => now,
    cacheTtlMs: 60_000,
    fetchImpl: async () => {
      requestCount += 1;
      return new Response(JSON.stringify(sampleRecords), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const first = await service.get();
  const cached = await service.get();
  assert.equal(requestCount, 1);
  assert.equal(cached.metadata.retrievedAt, first.metadata.retrievedAt);

  now = new Date(now.getTime() + 61_000);
  await service.refresh();
  assert.equal(requestCount, 2);
});

test("keeps the prior snapshot and marks it stale when a refresh fails", async () => {
  let fail = false;
  let now = new Date("2026-10-21T00:00:00.000Z");
  const service = createDosmLabourForceService({
    now: () => now,
    cacheTtlMs: 1_000,
    fetchImpl: async () => fail
      ? new Response("unavailable", { status: 503 })
      : new Response(JSON.stringify(sampleRecords), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
  });

  const initial = await service.get();
  fail = true;
  now = new Date(now.getTime() + 2_000);
  const stale = await service.get();
  assert.equal(stale.isStale, true);
  assert.match(stale.warning ?? "", /latest refresh failed/i);
  assert.equal(stale.metadata.retrievedAt, initial.metadata.retrievedAt);
  await assert.rejects(service.refresh(), /HTTP 503/);
});

test("filters by inclusive month boundaries and validates their order", async () => {
  const service = createDosmLabourForceService({
    now: () => new Date("2026-10-21T00:00:00.000Z"),
    fetchImpl: async () => new Response(JSON.stringify(sampleRecords), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  });

  const filtered = await service.get({ fromMonth: "2026-08", toMonth: "2026-08" });
  assert.deepEqual(filtered.observations.map(row => row.date), ["2026-08-01"]);
  await assert.rejects(
    service.get({ fromMonth: "2026-09", toMonth: "2026-08" }),
    /start month must not be after/,
  );
});
