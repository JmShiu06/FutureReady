import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createAiRouter } from "./ai";
import type { generateLlmExplanation } from "../lib/runpod";
import { CreateAiExplanationResponse } from "@workspace/api-zod";
import { RunpodConfigurationError, RunpodRequestError } from "../lib/runpod";
import { prepareAiContext } from "../lib/aiEvidence";
import { FEATURE_PROMPTS, type PromptFeature } from "../lib/llmPrompts";

const marketFixture = {
  metadata: { sourceName: "DOSM mocked observations", sourceUrl: "https://open.dosm.gov.my/data-catalogue/lfs_month",
    latestObservationDate: "2026-01-01", retrievedAt: "2026-01-02T00:00:00Z", caveats: ["National aggregates only"] },
  observations: [{ date: "2026-01-01", unemploymentRate: 3, participationRate: 70 }], isStale: false,
};
function mockReply(input: Parameters<typeof generateLlmExplanation>[0]) {
  const explanation = "Synthetic final answer.";
  switch (input.context.task) {
    case "learning-roadmap": return { explanation: JSON.stringify({ explanation, resources: [] }) };
    case "market-trends": return { explanation: JSON.stringify({ explanation, sourceIds: ["dosm:lfs_month"] }) };
    case "profile-skills": return { explanation: JSON.stringify({ suggestions: [{ skill: (input.context.allowedSuggestions as string[])[0], rationale: "Useful for the fictional goal." }] }) };
    default: return { explanation };
  }
}
function requestFor(feature: PromptFeature) {
  return { feature, ...(feature === "cv-analysis" ? { cvDetectedSkill: "python" } : { sampleId: "data-starter" }), ...(feature === "job-fit" ? { jobId: "demo-data-analyst" } : {}), ...(feature === "sdg-contribution" ? { goal: 4 } : {}) };
}

async function testServer(provider: typeof generateLlmExplanation, run: (post: (body: unknown, path?: string) => Promise<Response>) => Promise<void>) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", createAiRouter(provider, input => prepareAiContext(input, { getLabourForce: async () => marketFixture as never })));
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
      { feature: "cv-analysis", cvDetectedSkill: "python", resume_text: "Do not send this" },
      { feature: "cv-analysis", sampleId: "data-starter", cvDetectedSkill: "python" },
      { feature: "cv-analysis", sampleId: "data-starter" },
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
      assert.equal(response.status, 200, `${feature}: ${JSON.stringify(await response.clone().json())}`);
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
  await testServer(async input => { calls++; notify(); await gate; return mockReply(input); }, async post => {
    const input = { feature: "cv-analysis", cvDetectedSkill: "python" };
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

it("connects every existing feature to its prompt and validates the unchanged response envelope", async () => {
  for (const feature of Object.keys(FEATURE_PROMPTS) as PromptFeature[]) await testServer(async input => {
    assert.equal(input.context.synthetic, feature !== "cv-analysis");
    assert.equal("profile" in input.context, false);
    if (feature === "cv-analysis") assert.deepEqual(input.context, { detectedSkill: "python" });
    else assert.equal(input.context.task, feature);
    assert.equal(input.json, FEATURE_PROMPTS[feature].output !== "text");
    return mockReply(input);
  }, async post => {
      const response = await post(requestFor(feature));
      assert.equal(response.status, 200, `${feature}: ${JSON.stringify(await response.clone().json())}`);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = CreateAiExplanationResponse.parse(await response.json());
      assert.equal(body.synthetic, feature !== "cv-analysis");
      assert.equal(body.finalAnswerOnly, true);
      if (feature !== "profile-skills") assert.equal(body.explanation, "Synthetic final answer.");
  });
});

it("limits repeated requests before the provider can incur further cost", async () => {
  let calls = 0;
  await testServer(async input => { calls++; return mockReply(input); }, async post => {
    for (let i = 0; i < 8; i++) assert.equal((await post({ feature: "cv-analysis", cvDetectedSkill: "python" })).status, 200);
    const blocked = await post({ feature: "cv-analysis", cvDetectedSkill: "python" });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("retry-after"), "60");
    assert.equal(calls, 8);
  });
});

it("each connected feature rejects malformed output and has safe provider-error fallback", async () => {
  for (const feature of Object.keys(FEATURE_PROMPTS) as PromptFeature[]) {
    await testServer(async input => {
      const reply = mockReply(input);
      return { explanation: input.json ? JSON.stringify({ ...JSON.parse(reply.explanation), untrusted: "do not expose" }) : "Invented 99% forecast." };
    }, async post => {
      const response = await post(requestFor(feature));
      assert.equal(response.status, 502, feature);
      assert.doesNotMatch(JSON.stringify(await response.json()), /untrusted|forecast/);
    });
    await testServer(async () => { throw new RunpodRequestError("completion", 503); }, async post => {
      const response = await post(requestFor(feature));
      assert.equal(response.status, 502, feature);
      assert.equal(typeof (await response.json() as { error: unknown }).error, "string");
    });
  }
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
      assert.equal((await post({ feature: "cv-analysis", cvDetectedSkill: "python" })).status, 503);
    } finally { release(); }
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);
  });
});
