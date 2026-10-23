import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { createAiInfoRouter } from "./ai-info";
import { generateLlmExplanation, getLlmModelInfo, LLM_PROVIDER } from "../lib/runpod";
import { getAiDisclosure } from "../lib/aiDisclosure";
import { FEATURE_PROMPTS } from "../lib/llmPrompts";

const env = {
  RUNPOD_LLM_BASE_URL: "https://disclosure-fixture.proxy.runpod.net/v1",
  RUNPOD_LLM_API_KEY: "fictional-fixture-key-never-public",
  RUNPOD_LLM_MODEL: "Fixture/Model-Identity-Test",
};
const input = { instruction: "Explain a fictional skill.", context: { skill: "Fictional testing skill" } };
const completion = () => Response.json({ choices: [{ message: { content: "Fictional explanation." }, finish_reason: "stop" }] });

describe("public AI model disclosure", () => {
  it("returns the exact configured identity used by actual request construction and stamps the output", async () => {
    let requestModel: unknown;
    let requests = 0;
    const result = await generateLlmExplanation(input, {
      env,
      fetcher: async (_url, init) => {
        requests++;
        requestModel = JSON.parse(String(init?.body)).model;
        return completion();
      },
    });
    const info = getAiDisclosure(env);
    assert.equal(info.provider, LLM_PROVIDER);
    assert.equal(info.modelId, requestModel);
    assert.equal(info.modelStatus, "configured");
    assert.deepEqual(result.aiModel, { provider: info.provider, modelId: requestModel });
    assert.equal(requests, 1, "Reading disclosure must not make another provider call");
  });

  it("reads changed model configuration instead of keeping a hardcoded model name", () => {
    assert.equal(getAiDisclosure({ ...env, RUNPOD_LLM_MODEL: "Fixture/Replacement-Model" }).modelId, "Fixture/Replacement-Model");
    assert.equal(getAiDisclosure({}).modelId, null);
    assert.equal(getAiDisclosure({}).modelStatus, "unknown");
  });

  it("discloses a dynamically discovered model without starting discovery itself", async () => {
    const discoveryEnv = { ...env, RUNPOD_LLM_MODEL: undefined, RUNPOD_LLM_BASE_URL: "https://disclosure-discovery-fixture.proxy.runpod.net/v1" };
    assert.equal(getLlmModelInfo(discoveryEnv).modelId, null);
    const urls: string[] = [];
    const generated = await generateLlmExplanation(input, {
      env: discoveryEnv,
      fetcher: async url => {
        urls.push(String(url));
        return String(url).endsWith("/models")
          ? Response.json({ data: [{ id: "Fixture/Discovered-Model" }] })
          : completion();
      },
    });
    assert.equal(generated.aiModel?.modelId, "Fixture/Discovered-Model");
    assert.equal(getAiDisclosure(discoveryEnv).modelId, generated.aiModel?.modelId);
    assert.equal(getAiDisclosure(discoveryEnv).modelStatus, "discovered");
    assert.equal(urls.length, 2);
  });

  it("covers every supported explanation feature, local CV extraction and reused guidance accurately", () => {
    const info = getAiDisclosure(env);
    for (const feature of Object.keys(FEATURE_PROMPTS)) {
      assert.equal(info.features.find(item => item.id === feature)?.usesLanguageModel, true, feature);
    }
    assert.equal(info.features.find(item => item.id === "skill-analysis")?.usage, "generation");
    assert.equal(info.features.find(item => item.id === "skill-learning-guidance")?.usage, "reused-output");
    assert.equal(info.features.find(item => item.id === "cv-extraction")?.usesLanguageModel, false);
    assert.ok(info.nonAiUses.some(text => /match scores/i.test(text)));
    assert.ok(info.nonAiUses.some(text => /roadmap order/i.test(text)));
    assert.ok(info.dataPractices.some(text => /browser storage/i.test(text)));
  });

  it("GET /api/ai-info exposes only public metadata, never keys, endpoint URLs or personal data", async () => {
    const app = express();
    app.use("/api", createAiInfoRouter(env));
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/ai-info`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = await response.json() as Record<string, unknown>;
      assert.equal(body.modelId, env.RUNPOD_LLM_MODEL);
      const json = JSON.stringify(body);
      assert.equal(json.includes(env.RUNPOD_LLM_API_KEY), false);
      assert.equal(json.includes(env.RUNPOD_LLM_BASE_URL), false);
      assert.deepEqual(Object.keys(body).sort(), ["dataPractices", "features", "guardrails", "modelId", "modelStatus", "nonAiUses", "provider"]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
