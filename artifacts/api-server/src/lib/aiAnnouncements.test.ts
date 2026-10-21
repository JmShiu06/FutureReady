import assert from "node:assert/strict";
import test from "node:test";
import { createAiAnnouncementService, parseMinistryListing } from "./aiAnnouncements";

const card = (href: string, title: string, date: string, category = "Press Release") =>
  `<a class="group relative" href="${href}"><div><p class="font-semibold text-foreground-warning">${category}</p></div>` +
  `<div><p class="line-clamp-2 font-semibold -tracking-[0.01em] text-foreground">${title}</p></div>` +
  `<time class="text-dim-500">${date}</time></a>`;

const html =
  card("/en-GB/siaran/ai-one", "AI Malaysia Takeover 2026", "11 Aug 2026") +
  card("/en-GB/siaran/other", "Groundbreaking Event", "12 Aug 2026") +
  card("/en-GB/siaran/ai-two", "Towards An AI Nation", "30 Sep 2026", "Speech");

test("keeps only AI-titled entries with real dates, newest first", () => {
  const { all, items } = parseMinistryListing(html);
  assert.equal(all, 3);
  assert.deepEqual(items.map(i => i.publishedOn), ["2026-09-30", "2026-08-11"]);
  assert.equal(items[0]?.url, "https://www.digital.gov.my/en-GB/siaran/ai-two");
  assert.equal(items[0]?.category, "Speech");
});

test("fails loudly when the page layout is not recognised", () => {
  assert.throws(() => parseMinistryListing("<html>redesigned</html>"), /not recognised/);
});

test("rejects impossible dates", () => {
  assert.throws(() => parseMinistryListing(card("/en-GB/siaran/x", "AI plan", "31 Feb 2026")), /not recognised/);
});

test("keeps the earlier copy and marks it stale when a refresh fails", async () => {
  let fail = false;
  let now = new Date("2026-10-05T00:00:00.000Z");
  const service = createAiAnnouncementService({
    now: () => now,
    cacheTtlMs: 1_000,
    fetchImpl: async () => (fail ? new Response("no", { status: 503 }) : new Response(html, { status: 200 })),
  });
  const first = await service.get();
  assert.equal(first.isStale, false);
  fail = true;
  now = new Date(now.getTime() + 2_000);
  const stale = await service.get();
  assert.equal(stale.isStale, true);
  assert.match(stale.warning ?? "", /refresh failed/i);
  assert.equal(stale.retrievedAt, first.retrievedAt);
  await assert.rejects(service.refresh(), /HTTP 503/);
});

test("throws when the source fails and nothing is cached", async () => {
  const service = createAiAnnouncementService({ fetchImpl: async () => new Response("no", { status: 500 }) });
  await assert.rejects(service.get());
});
