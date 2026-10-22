import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createAiRouter } from "./ai";
import type { generateLlmExplanation } from "../lib/runpod";
import { CreateAiExplanationResponse } from "@workspace/api-zod";

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
    ]) assert.equal((await post(body)).status, 400);
    assert.equal(calls, 0);
    assert.equal((await post({ skillName: "User skill", taskTraits: ["digital"] }, "/ai/task-exposure/explanation")).status, 410);
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
