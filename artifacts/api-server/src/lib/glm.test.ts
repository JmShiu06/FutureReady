import { it } from "node:test";
import assert from "node:assert/strict";
import { buildLlmMessages } from "./llmPrompts";
import { generateGlmExplanation, GLM_ENDPOINT, GlmPrivacyError, GlmRequestError } from "./glm";
import { RunpodConfigurationError } from "./runpod";

const env = { GLM_API_KEY: "offline-test-key" };
const input = { instruction: "Explain supplied facts.", context: { synthetic: true, task: "career-explorer" } };
const id = "offline-job-1";
const completion = (message: unknown = { role: "assistant", content: "Synthetic final answer.", reasoning_content: null }, finish_reason = "stop") => ({
  id, status: "COMPLETED",
  output: [{ cost: 0, result: { model: "zai-org/GLM-5.3", choices: [{ finish_reason, message }] } }],
});
const noWait = async (_ms: number, signal: AbortSignal) => { signal.throwIfAborted(); };

it("matches the supplied GLM Playground contract and extracts an immediate completed result", async () => {
  let calls = 0;
  const result = await generateGlmExplanation(input, { env, fetcher: async (url, init) => {
    calls++;
    assert.equal(url, `${GLM_ENDPOINT}/run`);
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer offline-test-key");
    assert.ok(init?.signal instanceof AbortSignal);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.input, {
      messages: buildLlmMessages(input),
      sampling_params: { max_tokens: 600, temperature: 0.2 },
      model: "glm-5.3", "reasoning-effort": "low",
    });
    assert.deepEqual(body.policy, { executionTimeout: 45000, ttl: 60000 });
    assert.doesNotMatch(String(init?.body), /offline-test-key|response_format|chat_template_kwargs/);
    return Response.json(completion());
  } });
  assert.deepEqual(result, { explanation: "Synthetic final answer." });
  assert.equal(calls, 1);
});

it("polls a queued job with bounded growing intervals without resubmission", async () => {
  const paths: string[] = [];
  const intervals: number[] = [];
  const statuses = ["IN_QUEUE", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "COMPLETED"];
  const result = await generateGlmExplanation(input, { env,
    wait: async (ms, signal) => { signal.throwIfAborted(); intervals.push(ms); },
    fetcher: async (url, init) => {
      paths.push(String(url));
      assert.equal(init?.method, paths.length === 1 ? "POST" : "GET");
      const status = statuses.shift();
      return Response.json(status === "COMPLETED" ? completion() : { id, status });
    },
  });
  assert.equal(result.explanation, "Synthetic final answer.");
  assert.deepEqual(intervals, [500, 1000, 2000, 4000, 4000]);
  assert.equal(paths.filter(path => path.endsWith("/run")).length, 1);
  assert.ok(paths.slice(1).every(path => path === `${GLM_ENDPOINT}/status/${id}`));
});

it("blocks CV and non-synthetic contexts and missing configuration before any external call", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw new Error("Must not call"); };
  for (const context of [
    {}, { synthetic: false }, { detectedSkill: "python" }, { reviewedCv: { skills: [] } },
    { synthetic: true, reviewedCv: {} }, { synthetic: true, profile: {} }, { synthetic: true, detectedSkill: "python" },
  ]) await assert.rejects(generateGlmExplanation({ ...input, context }, { env, fetcher }), GlmPrivacyError);
  await assert.rejects(generateGlmExplanation(input, { env: {}, fetcher }), RunpodConfigurationError);
  await assert.rejects(generateGlmExplanation({ ...input, context: { synthetic: true, text: "x".repeat(18001) } }, { env, fetcher }), GlmRequestError);
  await assert.rejects(generateGlmExplanation({ ...input, instruction: "x".repeat(3001) }, { env, fetcher }), GlmRequestError);
  assert.equal(calls, 0);
});

it("rejects malformed, empty, truncated, reasoning-only and ambiguous completed outputs", async () => {
  const invalid = [
    {}, null, [], { ...completion(), output: [] }, { ...completion(), output: [{ result: {} }] },
    { ...completion(), output: [...completion().output, ...completion().output] },
    completion({ role: "assistant", content: "" }),
    completion({ role: "assistant", content: "Answer.", reasoning_content: "private thinking" }),
    completion({ role: "assistant", content: null, reasoning_content: "private thinking" }),
    completion({ role: "assistant", content: "<think>hidden</think>Answer." }),
    completion({ role: "assistant", content: "x".repeat(4001) }),
    completion({ role: "tool", content: "Answer." }),
    completion({ role: "assistant", content: "Cut off." }, "length"),
    completion({ role: "assistant", content: "Answer." }, "tool_calls"),
  ];
  for (const value of invalid) {
    await assert.rejects(generateGlmExplanation(input, { env, fetcher: async () => Response.json(value) }), GlmRequestError);
  }
  for (const text of ["not JSON", "x".repeat(65537)]) {
    await assert.rejects(generateGlmExplanation(input, { env, fetcher: async () => new Response(text) }), GlmRequestError);
  }
});

it("handles terminal failures without exposing worker errors or cancelling completed work", async () => {
  for (const status of ["FAILED", "TIMED_OUT", "CANCELLED"]) {
    let calls = 0;
    await assert.rejects(generateGlmExplanation(input, { env, fetcher: async () => {
      calls++;
      return Response.json({ id, status, error: "private upstream diagnostic" });
    } }), error => {
      assert.ok(error instanceof GlmRequestError);
      assert.equal(error.stage, "job");
      assert.doesNotMatch(error.message, /private|diagnostic/);
      return true;
    });
    assert.equal(calls, 1);
  }
});

it("never retries ambiguous submissions or HTTP errors, including rate limits", async () => {
  for (const status of [400, 401, 403, 404, 429, 500]) {
    let calls = 0;
    await assert.rejects(generateGlmExplanation(input, { env, fetcher: async () => {
      calls++;
      return new Response("private upstream detail", { status });
    } }), error => {
      assert.ok(error instanceof GlmRequestError);
      assert.equal(error.status, status);
      assert.equal(error.stage, "submit");
      assert.doesNotMatch(error.message, /private upstream/);
      return true;
    });
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(generateGlmExplanation(input, { env, fetcher: async () => {
    calls++; throw new Error("private network failure");
  } }), GlmRequestError);
  assert.equal(calls, 1);
});

it("validates job IDs, status, poll identity and HTTP failures; cancels abandoned known jobs", async () => {
  for (const badId of ["../escape", "id?token=secret", "", "x".repeat(201), 42]) {
    let calls = 0;
    await assert.rejects(generateGlmExplanation(input, { env, fetcher: async () => {
      calls++; return Response.json({ id: badId, status: "IN_QUEUE" });
    } }), GlmRequestError);
    assert.equal(calls, 1);
  }
  for (const outcome of [
    Response.json({ id: "different-job", status: "COMPLETED" }),
    Response.json({ id, status: "UNKNOWN" }),
    new Response("private", { status: 429 }),
  ]) {
    const paths: string[] = [];
    await assert.rejects(generateGlmExplanation(input, { env, wait: noWait, fetcher: async url => {
      paths.push(String(url));
      if (String(url).endsWith("/run")) return Response.json({ id, status: "IN_QUEUE" });
      if (String(url).includes("/cancel/")) return Response.json({ id, status: "CANCELLED" });
      return outcome;
    } }), GlmRequestError);
    assert.deepEqual(paths, [`${GLM_ENDPOINT}/run`, `${GLM_ENDPOINT}/status/${id}`, `${GLM_ENDPOINT}/cancel/${id}`]);
  }
});

it("honours the total deadline and cancels known queued jobs with a separate signal", async () => {
  const paths: string[] = [];
  await assert.rejects(generateGlmExplanation(input, { env, timeoutMs: 20, fetcher: async (url, init) => {
    paths.push(String(url));
    if (String(url).includes("/cancel/")) assert.equal(init?.signal?.aborted, false);
    return Response.json({ id, status: "IN_QUEUE" });
  } }), error => error instanceof GlmRequestError && error.stage === "timeout");
  assert.deepEqual(paths, [`${GLM_ENDPOINT}/run`, `${GLM_ENDPOINT}/cancel/${id}`]);
});

it("honours client abort without resubmitting and safely ignores cancellation failures", async () => {
  const controller = new AbortController();
  const paths: string[] = [];
  await assert.rejects(generateGlmExplanation(input, { env, signal: controller.signal,
    wait: async () => { controller.abort(); controller.signal.throwIfAborted(); },
    fetcher: async url => {
      paths.push(String(url));
      if (String(url).includes("/cancel/")) throw new Error("private cancellation error");
      return Response.json({ id, status: "IN_QUEUE" });
    },
  }), error => error instanceof GlmRequestError && error.stage === "cancelled");
  assert.deepEqual(paths, [`${GLM_ENDPOINT}/run`, `${GLM_ENDPOINT}/cancel/${id}`]);
  paths.length = 0;
  await assert.rejects(generateGlmExplanation(input, { env, signal: controller.signal,
    fetcher: async url => { paths.push(String(url)); throw new Error("Do not call"); },
  }), GlmRequestError);
  assert.deepEqual(paths, []);
});

it("bounds requested tokens and preserves JSON task instructions without inventing worker options", async () => {
  await generateGlmExplanation({ ...input, json: true, maxTokens: 9000 }, { env, fetcher: async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.input.sampling_params.max_tokens, 4000);
    assert.deepEqual(body.input.messages, buildLlmMessages(input));
    assert.equal(body.input.response_format, undefined);
    return Response.json(completion({ role: "assistant", content: '{"explanation":"A synthetic answer."}' }));
  } });
});
