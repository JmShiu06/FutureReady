import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createAiRouter } from "./ai";
import type { generateLlmExplanation } from "../lib/runpod";
import { CreateAiExplanationResponse } from "@workspace/api-zod";
import { RunpodConfigurationError, RunpodRequestError } from "../lib/runpod";

async function testServer(provider: typeof generateLlmExplanation, run: (post: (body: unknown, path?: string) => Promise<Response>) => Promise<void>) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", createAiRouter(provider));
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  try {
    await run((body, path = "/ai/explanations") => fetch(`${base}${path}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

it("rejects arbitrary profiles, CV text, extra fields, and unknown features before contacting the provider", async () => {
  let calls = 0;
  await testServer(async () => { calls++; return { explanation: "Synthetic final answer." }; }, async post => {
    for (const body of [
      {}, { feature: "other", sampleId: "data-starter" },
      { feature: "career-explorer", sampleId: "real-person" },
      { feature: "cv-analysis", sampleId: "data-starter", resume_text: "Do not send this" },
      { feature: "digital-twin", sampleId: "data-starter", profile: { name: "Do not send this" } },
      { feature: "career-explorer", sampleId: "data-starter", goal: 4 },
      { feature: "job-fit", sampleId: "data-starter" },
      { feature: "sdg-contribution", sampleId: "data-starter" },
    ]) assert.equal((await post(body)).status, 400);
    assert.equal(calls, 0);
    assert.equal((await post({ skillName: "User skill", taskTraits: ["digital"] }, "/ai/task-exposure/explanation")).status, 410);
  });
});

it("uses validated structured output for profile suggestions and refuses unsupported SDG evidence before inference", async () => {
  let calls = 0;
  await testServer(async input => {
    calls++;
    if (input.json) return { explanation: JSON.stringify({ suggestions: [{ skill: (input.context.allowedSuggestions as string[])[0], rationale: "Useful for the fictional goal." }] }) };
    return { explanation: "This is a qualitative interpretation of the supplied evidence." };
  }, async post => {
    assert.equal((await post({ feature: "sdg-contribution", sampleId: "data-starter", goal: 9 })).status, 422);
    assert.equal(calls, 0);
    for (const body of [
      { feature: "sdg-contribution", sampleId: "data-starter", goal: 4 },
      { feature: "job-fit", sampleId: "data-starter", jobId: "demo-data-analyst" },
      { feature: "profile-skills", sampleId: "data-starter" },
    ]) {
      const response = await post(body);
      assert.equal(response.status, 200);
      const result = CreateAiExplanationResponse.parse(await response.json());
      assert.ok(result.evidence?.length);
      if (body.feature === "profile-skills") assert.equal(result.suggestions?.length, 1);
    }
  });
});

it("deduplicates identical in-flight requests rather than calling the GPU twice", async () => {
  let calls = 0;
  let release!: () => void;
  let notify!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const started = new Promise<void>(r => { notify = r; });
  await testServer(async () => { calls++; notify(); await gate; return { explanation: "Fictional final answer." }; }, async post => {
    const input = { feature: "cv-analysis", sampleId: "data-starter" };
    const first = post(input);
    await started;
    const second = post(input);
    // Let the HTTP server receive the second request while the provider is pending.
    await new Promise(r => setTimeout(r, 50));
    release();
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);
    assert.equal(calls, 1);
  });
});

it("handles Pod failures safely without mutating state or exposing provider internals", async () => {
  for (const error of [new RunpodConfigurationError("Runpod is not configured."), new RunpodRequestError("completion"), new RunpodRequestError("completion", 401)]) {
    await testServer(async () => { throw error; }, async post => {
      const response = await post({ feature: "career-explorer", sampleId: "data-starter" });
      assert.ok([502, 503].includes(response.status));
      const body = await response.json() as { error?: unknown };
      assert.equal(typeof body.error, "string");
    });
  }
  await testServer(async () => ({ explanation: "A fabricated 99% chance. https://invented.invalid" }), async post => {
    const response = await post({ feature: "career-explorer", sampleId: "data-starter" });
    assert.equal(response.status, 502);
    assert.equal(JSON.stringify(await response.json()).includes("invented.invalid"), false);
  });
});

it("connects all requested features to one provider using synthetic context and a typed final-answer envelope", async () => {
  await testServer(async input => {
    assert.equal(input.context.synthetic, true);
    assert.equal("profile" in input.context, false);
    return { explanation: "Synthetic final answer." };
  }, async post => {
    for (const feature of ["career-explorer", "cv-analysis", "learning-roadmap", "digital-twin", "task-exposure"]) {
      const response = await post({ feature, sampleId: "data-starter" });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = CreateAiExplanationResponse.parse(await response.json());
      assert.equal(body.synthetic, true);
      assert.equal(body.finalAnswerOnly, true);
      assert.equal(body.explanation, "Synthetic final answer.");
    }
  });
});

it("limits repeated requests before the provider can incur further cost", async () => {
  let calls = 0;
  await testServer(async () => { calls++; return { explanation: "Synthetic final answer." }; }, async post => {
    for (let i = 0; i < 8; i++) assert.equal((await post({ feature: "cv-analysis", sampleId: "data-starter" })).status, 200);
    const blocked = await post({ feature: "cv-analysis", sampleId: "data-starter" });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("retry-after"), "60");
    assert.equal(calls, 8);
  });
});

it("limits concurrent model calls and releases the slots after completion", async () => {
  let release!: () => void;
  let ready!: () => void;
  let calls = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { ready = resolve; });
  await testServer(async () => {
    if (++calls === 2) ready();
    await gate;
    return { explanation: "Synthetic final answer." };
  }, async post => {
    const first = post({ feature: "career-explorer", sampleId: "data-starter" });
    const second = post({ feature: "digital-twin", sampleId: "data-starter" });
    await started;
    try {
      assert.equal((await post({ feature: "cv-analysis", sampleId: "data-starter" })).status, 503);
    } finally { release(); }
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);
  });
});
