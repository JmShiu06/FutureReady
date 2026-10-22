import { it } from "node:test";
import assert from "node:assert/strict";
import { sdgMappings } from "@workspace/workforce-evidence";
import { AiContextError, prepareAiContext, parseSkillSuggestions, validateQualitativeAnswer } from "./aiEvidence";

it("uses the same source-supported SDG mappings as the UI and refuses unverified goals", async () => {
  for (const goal of [4, 10]) {
    const example = await prepareAiContext({ feature: "sdg-contribution", sampleId: "data-starter", goal });
    const supported = sdgMappings.filter(m => m.goal === goal && m.status === "source-supported");
    assert.deepEqual((example.context.mappings as { skills: string[] }[]).map(m => m.skills), supported.map(m => m.skills));
    assert.equal(/\d/.test(JSON.stringify(example.context)), false);
    assert.ok(example.evidence.every(e => e.url?.startsWith("https://docs.un.org/")));
    assert.equal(example.context.profileUsed, false);
  }
  for (const goal of [8, 9, 17]) await assert.rejects(
    prepareAiContext({ feature: "sdg-contribution", sampleId: "data-starter", goal }),
    e => e instanceof AiContextError && e.status === 422,
  );
});

it("selects only provider-returned listing text, keeps demo provenance and never needs private profile inputs", async () => {
  const example = await prepareAiContext({ feature: "job-fit", sampleId: "data-starter", jobId: "demo-data-analyst" });
  const listing = example.context.listing as { demo: boolean; description: string; company?: string; salaryMin?: number };
  assert.equal(listing.demo, true);
  assert.match(listing.description, /Illustrative demo listing/);
  assert.equal(listing.company, undefined);
  assert.equal(listing.salaryMin, undefined);
  assert.match(example.evidence[0].note, /not a live vacancy/);
  await assert.rejects(prepareAiContext({ feature: "job-fit", sampleId: "data-starter", jobId: "absent" }), AiContextError);
});

it("does not fabricate market context when DOSM is offline and preserves stale evidence warnings", async () => {
  await assert.rejects(prepareAiContext({ feature: "market-trends", sampleId: "data-starter" }, {
    getLabourForce: async () => { throw new Error("upstream private error"); },
  }), e => e instanceof AiContextError && e.status === 503 && !e.message.includes("private"));
  const data = {
    metadata: {
      sourceName: "DOSM test fixture", sourceUrl: "https://open.dosm.gov.my/data-catalogue/lfs_month",
      latestObservationDate: "2026-01-01", caveats: ["National aggregates only"],
    },
    observations: [{ date: "2026-01-01", unemploymentRate: 3, participationRate: 70 }],
    isStale: true, warning: "Showing previously retrieved data.",
  };
  const result = await prepareAiContext({ feature: "market-trends", sampleId: "data-starter" }, {
    getLabourForce: async () => data as never,
  });
  assert.equal(result.context.stale, true);
  assert.match(result.evidence[0].note, /Stale observations/);
  assert.match(result.contextSummary[0], /2026-01-01/);
});

it("validates structured profile suggestions against the existing dataset gaps", async () => {
  const example = await prepareAiContext({ feature: "profile-skills", sampleId: "data-starter" });
  assert.equal(example.json, true);
  const skill = example.allowedSuggestions[0];
  const valid = { suggestions: [{ skill, rationale: "Useful practice for the fictional career goal." }] };
  assert.equal(parseSkillSuggestions(JSON.stringify(valid), example.allowedSuggestions)[0].skill, skill);
  for (const invalid of [
    { suggestions: [{ skill: "Invented verified skill", rationale: "Made up." }] },
    { suggestions: [{ skill, rationale: "Useful.", level: 5 }] },
    { suggestions: [...valid.suggestions, ...valid.suggestions] },
    { suggestions: [{ skill, rationale: "Get certified at https://example.com" }] },
    { suggestions: [], profile: {} },
  ]) assert.throws(() => parseSkillSuggestions(JSON.stringify(invalid), example.allowedSuggestions));
  assert.throws(() => parseSkillSuggestions("```json\n{}\n```", example.allowedSuggestions));
});

it("keeps authoritative figures and links out of generated prose", () => {
  validateQualitativeAnswer("The supplied observations are national aggregates, not evidence of AI causation.");
  for (const text of ["Your chance is 90%.", "Visit https://example.com", "www.example.com", "Source 【official】"]) {
    assert.throws(() => validateQualitativeAnswer(text));
  }
});

it("adds constraints, fictional CV detections, official evidence and adoption assumptions without changing matching", async () => {
  const career = await prepareAiContext({ feature: "career-explorer", sampleId: "data-starter" });
  assert.equal(career.evidence.length, 3);
  const cv = await prepareAiContext({ feature: "cv-analysis", sampleId: "data-starter" });
  assert.ok((cv.context.fictionalCv as { detectedSkills: string[] }).detectedSkills.length > 0);
  const plan = await prepareAiContext({ feature: "learning-roadmap", sampleId: "data-starter" });
  assert.equal((plan.context.studyConstraints as { budget: string }).budget, "free practice only");
  const twin = await prepareAiContext({ feature: "digital-twin", sampleId: "data-starter" });
  assert.equal((twin.context.scenarios as unknown[]).length, 2);
  assert.deepEqual(career.context.deterministicMatch, cv.context.deterministicMatch);
  assert.equal(/\d/.test(JSON.stringify(twin.context)), false);
});
