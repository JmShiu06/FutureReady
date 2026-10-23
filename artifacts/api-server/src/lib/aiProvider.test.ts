import { it } from "node:test";
import assert from "node:assert/strict";
import { generateAiExplanation } from "./aiProvider";
import { GLM_ENDPOINT, GlmPrivacyError } from "./glm";
import { RunpodConfigurationError } from "./runpod";

const qwen = {
  RUNPOD_LLM_BASE_URL: "https://api.runpod.ai/v2/test-only/openai/v1",
  RUNPOD_LLM_API_KEY: "offline-qwen-key", RUNPOD_LLM_MODEL: "Qwen/test",
};
const input = { instruction: "Explain supplied facts.", context: { synthetic: true } };

it("defaults to Qwen even when a GLM key exists, preserving the existing request", async () => {
  for (const AI_PROVIDER of [undefined, "", "qwen"]) {
    let calls = 0;
    await generateAiExplanation(input, { env: { ...qwen, GLM_API_KEY: "offline-glm-key", AI_PROVIDER }, fetcher: async (url, init) => {
      calls++;
      assert.equal(url, `${qwen.RUNPOD_LLM_BASE_URL}/chat/completions`);
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer offline-qwen-key");
      assert.equal(JSON.parse(String(init?.body)).model, qwen.RUNPOD_LLM_MODEL);
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: "Synthetic answer." } }] });
    } });
    assert.equal(calls, 1);
  }
});

it("selects GLM only through explicit server configuration and never falls back", async () => {
  const env = { ...qwen, AI_PROVIDER: "glm", GLM_API_KEY: "offline-glm-key" };
  let calls = 0;
  await generateAiExplanation(input, { env, fetcher: async url => {
    calls++;
    assert.equal(url, `${GLM_ENDPOINT}/run`);
    return Response.json({ id: "offline-job", status: "COMPLETED", output: [{ result: { choices: [{
      finish_reason: "stop", message: { role: "assistant", content: "Synthetic answer." },
    }] } }] });
  } });
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(generateAiExplanation(input, { env, fetcher: async () => { calls++; return new Response(null, { status: 401 }); } }));
  assert.equal(calls, 1);
});

it("rejects unknown provider configuration, missing GLM key and personal context without any external call", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw new Error("Do not call"); };
  await assert.rejects(generateAiExplanation(input, { env: { ...qwen, AI_PROVIDER: "other" }, fetcher }), RunpodConfigurationError);
  await assert.rejects(generateAiExplanation(input, { env: { ...qwen, AI_PROVIDER: "glm" }, fetcher }), RunpodConfigurationError);
  for (const context of [{ detectedSkill: "python" }, { reviewedCv: { skills: ["python"] } }]) {
    await assert.rejects(generateAiExplanation({ ...input, context }, {
      env: { AI_PROVIDER: "glm", GLM_API_KEY: "offline-glm-key" }, fetcher,
    }), GlmPrivacyError);
  }
  assert.equal(calls, 0);
});
