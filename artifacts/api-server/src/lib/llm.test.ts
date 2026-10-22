import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanFinalAnswer, generateLlmExplanation, RunpodConfigurationError, RunpodRequestError } from "./runpod";
import { syntheticExplanationContext, type AiFeature, type AiSampleId } from "./aiExamples";

const env = {
  RUNPOD_LLM_BASE_URL: "https://api.runpod.ai/v2/test-only/openai/v1",
  RUNPOD_LLM_API_KEY: "synthetic-test-key",
  RUNPOD_LLM_MODEL: "Qwen/Qwen3-4B",
};
const input = syntheticExplanationContext("career-explorer", "data-starter");

describe("shared RunPod Qwen3 service", () => {
  it("uses the LLM API key server-side, disables thinking, and returns only the final answer", async () => {
    const fetcher: typeof fetch = async (url, init) => {
      assert.equal(String(url), `${env.RUNPOD_LLM_BASE_URL}/chat/completions`);
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer synthetic-test-key");
      assert.ok(init?.signal instanceof AbortSignal);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "Qwen/Qwen3-4B");
      assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
      assert.equal(body.max_tokens, 600);
      assert.equal(JSON.parse(body.messages[1].content).synthetic, true);
      assert.equal(String(init?.body).includes("synthetic-test-key"), false);
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: "A clean fictional career explanation.", reasoning_content: null } }] });
    };
    assert.deepEqual(await generateLlmExplanation(input, { env, fetcher }), { explanation: "A clean fictional career explanation." });
  });

  it("rejects thinking traces, separate reasoning fields, malformed and truncated outputs", () => {
    assert.equal(cleanFinalAnswer({ content: "<think>\n</think>\nFinal answer.", reasoning_content: "" }, "stop"), "Final answer.");
    for (const message of [
      { content: "<think>private reasoning</think>Final answer." },
      { content: "Final answer.", reasoning_content: "private reasoning" },
      { content: "Reasoning: I should..." },
      { content: "</think>Final answer." },
      { content: "<analysis>private</analysis>Answer" },
      { content: "" },
      { content: null },
    ]) assert.throws(() => cleanFinalAnswer(message, "stop"), RunpodRequestError);
    assert.throws(() => cleanFinalAnswer({ content: "Cut off" }, "length"), RunpodRequestError);
  });

  it("fails explicitly for wrong credentials, invalid hosts, and upstream failures without leaking details", async () => {
    await assert.rejects(generateLlmExplanation(input, {
      env: { ...env, RUNPOD_LLM_API_KEY: undefined, RUNPOD_API_KEY: "obsolete-key" },
    }), RunpodConfigurationError);
    await assert.rejects(generateLlmExplanation(input, {
      env: { ...env, RUNPOD_LLM_BASE_URL: "https://example.com/v1" },
    }), RunpodConfigurationError);
    await assert.rejects(generateLlmExplanation(input, {
      env, fetcher: async () => new Response("private upstream detail", { status: 401 }),
    }), error => {
      assert.ok(error instanceof RunpodRequestError);
      assert.equal(error.status, 401);
      assert.equal(error.stage, "completion");
      assert.equal(error.message.includes("private"), false);
      return true;
    });
    await assert.rejects(generateLlmExplanation(input, {
      env, fetcher: async () => { throw new DOMException("Aborted", "AbortError"); },
    }), RunpodRequestError);
  });

  it("can discover a single served model when no model override is configured", async () => {
    const fetcher: typeof fetch = async url => String(url).endsWith("/models")
      ? Response.json({ data: [{ id: "Qwen/Qwen3-4B" }] })
      : Response.json({ choices: [{ finish_reason: "stop", message: { content: "Synthetic final answer." } }] });
    assert.equal((await generateLlmExplanation(input, {
      env: { ...env, RUNPOD_LLM_MODEL: undefined }, fetcher,
    })).explanation, "Synthetic final answer.");
  });
});

describe("server-owned synthetic examples", () => {
  it("grounds all five features and both fictional profiles in the unchanged dataset matcher", () => {
    for (const feature of ["career-explorer", "cv-analysis", "learning-roadmap", "digital-twin", "task-exposure"] as AiFeature[]) {
      for (const sample of ["data-starter", "operations-starter"] as AiSampleId[]) {
        const example = syntheticExplanationContext(feature, sample);
        assert.equal(example.context.synthetic, true);
        const match = example.context.deterministicMatch as { skillsConsidered: number; score: number; matchedSkills: string[] };
        assert.equal(match.skillsConsidered, 30);
        assert.equal(match.score, Math.round(match.matchedSkills.length / 30 * 1000) / 10);
        assert.ok(example.contextSummary.some(line => line.includes("not a hiring probability")));
      }
    }
  });
});
