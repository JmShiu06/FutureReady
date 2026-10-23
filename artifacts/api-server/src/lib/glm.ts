import { setTimeout as delay } from "node:timers/promises";
import { buildLlmMessages } from "./llmPrompts";
import { cleanFinalAnswer, RunpodConfigurationError, type generateLlmExplanation } from "./runpod";

export const GLM_ENDPOINT = "https://api.runpod.ai/v2/b1dd8hy2hqo1nb";
export const GLM_MODEL = "glm-5.3";
export const GLM_DEADLINE_MS = 45_000;
export const GLM_PRIVACY_MESSAGE = "GLM is currently restricted to synthetic/demo explanations. CV details and detected CV skills are not sent to GLM. Qwen remains available through the server's provider setting.";

export class GlmPrivacyError extends Error {
  constructor() { super(GLM_PRIVACY_MESSAGE); }
}

export class GlmRequestError extends Error {
  constructor(
    readonly stage: "submit" | "poll" | "response" | "job" | "timeout" | "cancelled",
    readonly status?: number,
  ) {
    super("GLM could not complete a validated explanation.");
  }
}

type Input = Parameters<typeof generateLlmExplanation>[0];
type Options = {
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  /** Dependency injection for offline tests; production always uses the bounded defaults. */
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  timeoutMs?: number;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GlmRequestError("response");
  return value as Record<string, unknown>;
}

async function readJob(response: Response): Promise<Record<string, unknown>> {
  // Bound bytes while reading, not just after buffering an untrusted worker response.
  if (!response.body) throw new GlmRequestError("response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65_536) throw new GlmRequestError("response");
      chunks.push(value);
    }
    return object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    throw new GlmRequestError("response");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function jobId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(value)) {
    throw new GlmRequestError("response");
  }
  return value;
}

function completedAnswer(job: Record<string, unknown>, input: Input): { explanation: string } {
  if (!Array.isArray(job.output) || job.output.length !== 1) throw new GlmRequestError("response");
  const result = object(object(job.output[0]).result);
  if (!Array.isArray(result.choices) || result.choices.length !== 1) throw new GlmRequestError("response");
  const choice = object(result.choices[0]);
  const message = object(choice.message);
  if (choice.finish_reason !== "stop" || message.role !== "assistant") throw new GlmRequestError("response");
  try {
    return { explanation: cleanFinalAnswer(message, choice.finish_reason,
      Math.min(24000, Math.max(4000, input.maxOutputCharacters ?? 4000))) };
  } catch {
    throw new GlmRequestError("response");
  }
}

/** Server-only queue adapter. Callers must supply server-prepared synthetic context. */
export async function generateGlmExplanation(input: Input, options: Options = {}): Promise<{ explanation: string }> {
  // Fail closed even when called directly, before reading credentials or making requests.
  if (input.context.synthetic !== true || "reviewedCv" in input.context || "detectedSkill" in input.context || "profile" in input.context) {
    throw new GlmPrivacyError();
  }
  if (JSON.stringify(input.context).length > 18_000 || input.instruction.length > 3_000) throw new GlmRequestError("response");
  const key = (options.env ?? process.env).GLM_API_KEY?.trim();
  if (!key) throw new RunpodConfigurationError("GLM is not configured. Set the backend GLM_API_KEY secret.");
  const fetcher = options.fetcher ?? fetch;
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const timeout = options.timeoutMs ?? GLM_DEADLINE_MS;
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > GLM_DEADLINE_MS) throw new GlmRequestError("response");
  const deadline = AbortSignal.timeout(timeout);
  const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  const wait = options.wait ?? ((ms, abort) => delay(ms, undefined, { signal: abort }));
  let id: string | undefined;
  let terminal = false;

  async function request(path: string, stage: "submit" | "poll", body?: unknown) {
    signal.throwIfAborted();
    const response = await fetcher(`${GLM_ENDPOINT}${path}`, {
      method: body === undefined ? "GET" : "POST", headers, signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new GlmRequestError(stage, response.status);
    }
    return readJob(response);
  }

  try {
    // No submit retries: a lost response can still represent a billable accepted job.
    let job = await request("/run", "submit", {
      input: {
        messages: buildLlmMessages(input),
        sampling_params: {
          max_tokens: Math.min(4000, Math.max(600, input.maxTokens ?? 600)),
          temperature: 0.2,
        },
        model: GLM_MODEL,
        "reasoning-effort": "low",
      },
      policy: { executionTimeout: GLM_DEADLINE_MS, ttl: 60_000 },
    });
    let interval = 500;
    while (true) {
      signal.throwIfAborted();
      const returnedId = jobId(job.id);
      if (id !== undefined && returnedId !== id) throw new GlmRequestError("response");
      id = returnedId;
      switch (job.status) {
        case "COMPLETED":
          terminal = true;
          return completedAnswer(job, input);
        case "FAILED":
        case "CANCELLED":
        case "TIMED_OUT":
          terminal = true;
          throw new GlmRequestError("job");
        case "IN_QUEUE":
        case "IN_PROGRESS":
          await wait(interval, signal);
          interval = Math.min(interval * 2, 4_000);
          job = await request(`/status/${encodeURIComponent(id)}`, "poll");
          break;
        default:
          throw new GlmRequestError("response");
      }
    }
  } catch (error) {
    if (signal.aborted) throw new GlmRequestError(options.signal?.aborted ? "cancelled" : "timeout");
    if (error instanceof GlmRequestError) throw error;
    throw new GlmRequestError("response");
  } finally {
    if (id && !terminal) {
      // Separate short signal: the main deadline may already have expired. Never log upstream details.
      await fetcher(`${GLM_ENDPOINT}/cancel/${encodeURIComponent(id)}`, {
        method: "POST", headers, signal: AbortSignal.timeout(1_500),
      }).then(response => response.body?.cancel()).catch(() => undefined);
    }
  }
}
