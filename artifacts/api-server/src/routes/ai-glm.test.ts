import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createAiRouter } from "./ai";
import { generateAiExplanation, assertCvProviderAllowed } from "../lib/aiProvider";
import { prepareAiContext } from "../lib/aiEvidence";
import { FEATURE_PROMPTS, type PromptFeature } from "../lib/llmPrompts";
import { CreateAiExplanationResponse } from "@workspace/api-zod";
import { GLM_ENDPOINT } from "../lib/glm";

const env = { AI_PROVIDER: "glm", GLM_API_KEY: "offline-glm-key" };
const marketFixture = {
  metadata: { sourceName: "DOSM mocked observations", sourceUrl: "https://open.dosm.gov.my/data-catalogue/lfs_month",
    latestObservationDate: "2026-01-01", retrievedAt: "2026-01-02T00:00:00Z", caveats: ["National aggregates only"] },
  observations: [{ date: "2026-01-01", unemploymentRate: 3, participationRate: 70 }], isStale: true,
};
const cv = { skills: ["python"], education: ["Synthetic diploma"], workExperience: [], certifications: [],
  projects: [], languages: [], extractionLimited: true };

async function server(
  provider: typeof generateAiExplanation,
  run: (post: (body: unknown, path?: string, signal?: AbortSignal) => Promise<Response>) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use("/api", createAiRouter(provider,
    input => prepareAiContext(input, { getLabourForce: async () => marketFixture as never }),
    () => assertCvProviderAllowed(env)));
  const listener = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => listener.once("listening", resolve));
  const base = `http://127.0.0.1:${(listener.address() as AddressInfo).port}/api`;
  try {
    await run((body, path = "/ai/explanations", signal) => fetch(`${base}${path}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal,
    }));
  } finally {
    listener.closeAllConnections();
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

function completed(content: string) {
  return Response.json({ id: "offline-job", status: "COMPLETED", output: [{
    result: { choices: [{ finish_reason: "stop", message: { role: "assistant", content, reasoning_content: null } }] },
  }] });
}

it("connects every permitted synthetic feature through GLM with unchanged validation and evidence envelopes", async () => {
  let calls = 0;
  await server((input, options) => generateAiExplanation(input, { ...options, env, fetcher: async (url, init) => {
    calls++;
    assert.equal(url, `${GLM_ENDPOINT}/run`);
    const context = JSON.parse(JSON.parse(String(init?.body)).input.messages[1].content);
    assert.equal(context.synthetic, true);
    assert.equal(context.reviewedCv, undefined);
    assert.equal(context.profile, undefined);
    assert.equal(context.deterministicMatch?.score, undefined);
    const explanation = "Synthetic explanation with the supplied limitations.";
    return completed(context.task === "learning-roadmap" ? JSON.stringify({ explanation, resources: [] })
      : context.task === "market-trends" ? JSON.stringify({ explanation, sourceIds: ["dosm:lfs_month"] })
      : context.task === "profile-skills" ? JSON.stringify({ suggestions: [{ skill: context.allowedSuggestions[0], rationale: "Useful for the fictional goal." }] })
      : explanation);
  } }), async post => {
    for (const feature of Object.keys(FEATURE_PROMPTS).filter(f => f !== "cv-analysis") as PromptFeature[]) {
      const response = await post({ feature, sampleId: "data-starter",
        ...(feature === "job-fit" ? { jobId: "demo-data-analyst" } : {}),
        ...(feature === "sdg-contribution" ? { goal: 4 } : {}),
      });
      assert.equal(response.status, 200, feature);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = CreateAiExplanationResponse.parse(await response.json());
      assert.equal(body.synthetic, true);
      assert.equal(body.finalAnswerOnly, true);
      if (feature === "market-trends") assert.match(body.evidence![0].note, /Stale/);
    }
  });
  assert.equal(calls, 8);
});

it("refuses both CV paths and arbitrary profiles without any GLM or fallback request", async () => {
  let calls = 0;
  await server((input, options) => generateAiExplanation(input, { ...options, env, fetcher: async () => {
    calls++; throw new Error("Do not call");
  } }), async post => {
    for (const [body, path] of [
      [{ feature: "cv-analysis", cvDetectedSkill: "python" }, "/ai/explanations"],
      [{ consent: true, data: cv }, "/ai/cv-career-explanation"],
    ] as const) {
      const response = await post(body, path);
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match((await response.json() as { error: string }).error, /restricted to synthetic\/demo/);
    }
    const response = await post({ feature: "career-explorer", sampleId: "data-starter", profile: { name: "private" } });
    assert.equal(response.status, 400);
  });
  assert.equal(calls, 0);
});

it("returns GLM-aware safe errors and still rejects unsupported generated figures", async () => {
  for (const status of [401, 429]) {
    await server((input, options) => generateAiExplanation(input, { ...options, env, fetcher: async () => new Response("private worker message", { status }) }), async post => {
      const response = await post({ feature: "career-explorer", sampleId: "data-starter" });
      assert.equal(response.status, 502);
      const body = await response.json() as { error: string };
      assert.match(body.error, /GLM/);
      if (status === 401) assert.match(body.error, /GLM_API_KEY/);
      assert.doesNotMatch(body.error, /RUNPOD_LLM_API_KEY|private worker|offline-glm-key/);
    });
  }
  await server((input, options) => generateAiExplanation(input, { ...options, env, fetcher: async () => completed("Invented 99% hiring chance.") }), async post => {
    const response = await post({ feature: "career-explorer", sampleId: "data-starter" });
    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(await response.json()), /99|hiring chance/);
  });
});

it("retains the existing rate limit for GLM before incurring additional inference calls", async () => {
  let calls = 0;
  await server((input, options) => generateAiExplanation(input, { ...options, env, fetcher: async () => {
    calls++; return completed("Synthetic answer.");
  } }), async post => {
    const body = { feature: "career-explorer", sampleId: "data-starter" };
    for (let i = 0; i < 8; i++) assert.equal((await post(body)).status, 200);
    assert.equal((await post(body)).status, 429);
  });
  assert.equal(calls, 8);
});

it("aborts shared work only after all subscribers disconnect", async () => {
  let started!: () => void;
  let aborted!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const cancelled = new Promise<void>(resolve => { aborted = resolve; });
  let calls = 0;
  let providerSignal: AbortSignal | undefined;
  await server(async (_input, options) => {
    calls++;
    providerSignal = options?.signal;
    started();
    return new Promise((_resolve, reject) => {
      providerSignal!.addEventListener("abort", () => { aborted(); reject(new Error("Cancelled")); }, { once: true });
    });
  }, async post => {
    const first = new AbortController();
    const second = new AbortController();
    const body = { feature: "career-explorer", sampleId: "data-starter" };
    const a = post(body, undefined, first.signal).catch(() => undefined);
    await ready;
    const b = post(body, undefined, second.signal).catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 50));
    first.abort();
    await a;
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(providerSignal!.aborted, false);
    assert.equal(calls, 1);
    second.abort();
    await b;
    await cancelled;
    assert.equal(providerSignal!.aborted, true);
  });
});
