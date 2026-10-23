import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createAiRouter } from "./ai";
import type { generateLlmExplanation } from "../lib/runpod";
import { GenerateCvCareerExplanationResponse } from "@workspace/api-zod";

const data = { skills: ["python", "sql"], languages: [], extractionLimited: true };
const sections = {
  skillAnalysis: "The reviewed CV lists python and sql. These could complement each other by combining retrieval with repeatable data preparation, without establishing proficiency.",
  careerMatchAnalysis: "AI Engineer: python could support experimental data preparation, but machine learning is not evidenced. This uses a pooled reference.\n\nData Analyst: sql could help explore records, but data visualization is not evidenced.\n\nData Engineer: python and sql could transfer to transformation work, but data pipelines are not evidenced.",
  skillGapAnalysis: "Explore ai first, then communication: these appear across the supplied reference families and could help contextualize and explain data work. They are not evidenced here, not proven absent abilities.",
  improvementSuggestions: "Explore ai concepts then practise communication by explaining a small fictional data project. No verified resource yet for these priorities.",
  strengths: "Retrieval and repeatable preparation offer complementary coverage, although no work quality can be assessed.",
  areasForGrowth: "A work sample could clarify how you applied the skills; review it locally rather than sending personal details.",
};

async function server(provider: typeof generateLlmExplanation, run: (post: (body: unknown) => Promise<Response>) => Promise<void>) {
  const app = express();
  app.use(express.json({ limit: "48kb" }), createAiRouter(provider));
  const listener = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => listener.once("listening", resolve));
  const base = `http://127.0.0.1:${(listener.address() as AddressInfo).port}/ai/cv-career-explanation`;
  try {
    await run(body => fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  } finally {
    listener.closeAllConnections();
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

it("requires explicit consent and rejects personal/raw fields before invoking the provider", async () => {
  let calls = 0;
  await server(async () => { calls++; return { explanation: JSON.stringify(sections) }; }, async post => {
    for (const body of [
      { data }, { consent: false, data }, { consent: true, data, resume_text: "private" },
      { consent: true, data: { ...data, name: "private" } },
      { consent: true, data: { ...data, skills: ["not a detected catalogue skill"] } },
    ]) assert.equal((await post(body)).status, 400);
    assert.equal(calls, 0);
  });
});

it("returns six grounded sections, no-store and authoritative matches after consent", async () => {
  await server(async input => {
    assert.equal(input.json, true);
    assert.equal(input.maxTokens, 4000);
    assert.equal("sampleId" in input.context, false);
    assert.deepEqual(input.context.reviewedCv, { skills: data.skills });
    return { explanation: JSON.stringify(sections) };
  }, async post => {
    const response = await post({ consent: true, data });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const result = GenerateCvCareerExplanationResponse.parse(await response.json());
    assert.equal(Object.keys(result.sections).length, 6);
    assert.deepEqual(result.sections, sections);
    assert.ok(result.matches.every(match => match.matchedSkills.includes("python") || match.matchedSkills.includes("sql")));
  });
});

it("rate limits CV requests and never echoes malformed provider text", async () => {
  let calls = 0;
  await server(async () => { calls++; return { explanation: JSON.stringify(sections) }; }, async post => {
    for (let i = 0; i < 8; i++) assert.equal((await post({ consent: true, data })).status, 200);
    const blocked = await post({ consent: true, data });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("retry-after"), "60");
    assert.equal(calls, 8);
  });
  await server(async () => ({ explanation: "private unsupported provider text" }), async post => {
    const response = await post({ consent: true, data });
    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(await response.json()), /private unsupported provider text/);
  });
  await server(async () => ({ explanation: JSON.stringify({ ...sections, strengths: "The candidate is an expert." }) }), async post => {
    const response = await post({ consent: true, data });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(JSON.stringify(await response.json()), /candidate is an expert/);
  });
});
