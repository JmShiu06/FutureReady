import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createAiRouter } from "./ai";
import { generateAiExplanation } from "../lib/aiProvider";

for (const id of ["qwen", "glm"] as const) {
  it(`returns only safe, server-confirmed ${id} metadata on a successful explanation`, async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAiRouter((input, options) => generateAiExplanation(input, {
      ...options,
      env: {
        AI_PROVIDER: id, GLM_API_KEY: "offline-secret-glm",
        RUNPOD_LLM_API_KEY: "offline-secret-qwen",
        RUNPOD_LLM_BASE_URL: "https://api.runpod.ai/v2/test-only/openai/v1", RUNPOD_LLM_MODEL: "Qwen/test",
      },
      fetcher: async () => {
        const choice = { finish_reason: "stop", message: { role: "assistant", content: "A grounded fictional explanation." } };
        return Response.json(id === "glm"
          ? { id: "offline-job", status: "COMPLETED", output: [{ result: { choices: [choice] } }] }
          : { choices: [choice] });
      },
    })));
    const listener = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => listener.once("listening", resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(listener.address() as AddressInfo).port}/api/ai/explanations`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ feature: "career-explorer", sampleId: "data-starter" }),
      });
      assert.equal(response.status, 200);
      const body = await response.json() as Record<string, unknown>;
      assert.deepEqual(body.provider, { id });
      assert.doesNotMatch(JSON.stringify(body), /offline-secret|Bearer|GLM_API_KEY|RUNPOD_LLM_API_KEY|test-only/);
    } finally {
      listener.closeAllConnections();
      await new Promise<void>(resolve => listener.close(() => resolve()));
    }
  });
}
