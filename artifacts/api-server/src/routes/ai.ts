import { Router, type IRouter } from "express";
import { CreateAiExplanationBody, CreateAiExplanationResponse, type AiExplanation } from "@workspace/api-zod";
import { RunpodConfigurationError, RunpodRequestError } from "../lib/runpod";
import { generateAiExplanation, assertCvProviderAllowed } from "../lib/aiProvider";
import { GlmPrivacyError, GlmRequestError } from "../lib/glm";
import { prepareAiContext, AiContextError } from "../lib/aiEvidence";
import { parseFeatureAnswer } from "../lib/aiOutput";
import { CvCareerInputError, prepareCvCareerExplanation, parseCvCareerExplanation } from "../lib/cvCareerExplanation";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const MAX_ACTIVE_REQUESTS = 2;
export function createAiRouter(
  provider: typeof generateAiExplanation = generateAiExplanation,
  prepare = prepareAiContext,
  checkCvPrivacy: () => void = provider === generateAiExplanation ? assertCvProviderAllowed : () => undefined,
): IRouter {
const router: IRouter = Router();
const inFlight = new Map<string, { promise: Promise<AiExplanation>; controller: AbortController; users: number }>();
const requestWindows = new Map<string, { startedAt: number; count: number }>();
let activeRequests = 0;
let globalWindow = { startedAt: Date.now(), count: 0 };

function allowRequest(client: string): boolean {
  const now = Date.now();
  if (now - globalWindow.startedAt >= WINDOW_MS) globalWindow = { startedAt: now, count: 0 };
  if (globalWindow.count >= 30) return false;
  for (const [key, item] of requestWindows) {
    if (now - item.startedAt >= WINDOW_MS) requestWindows.delete(key);
  }
  const window = requestWindows.get(client);
  if (!window || now - window.startedAt >= WINDOW_MS) {
    if (requestWindows.size >= 1_000) return false;
    requestWindows.set(client, { startedAt: now, count: 1 });
  } else if (window.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  } else {
    window.count += 1;
  }

  globalWindow.count += 1;
  return true;
}

router.post("/ai/task-exposure/explanation", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(410).json({ error: "Profile-based AI requests are disabled. Use the synthetic AI explanation examples." });
});

router.post("/ai/cv-career-explanation", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  let prepared: ReturnType<typeof prepareCvCareerExplanation>;
  try {
    checkCvPrivacy();
    prepared = prepareCvCareerExplanation(req.body);
  } catch (error) {
    res.status(error instanceof GlmPrivacyError ? 403 : 400).json({
      error: error instanceof GlmPrivacyError || error instanceof CvCareerInputError ? error.message : "Invalid reviewed CV details.",
    });
    return;
  }
  if (!allowRequest(req.ip || req.socket.remoteAddress || "unknown")) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many AI explanation requests. Please wait a minute and try again." });
    return;
  }
  if (activeRequests >= MAX_ACTIVE_REQUESTS) {
    res.setHeader("Retry-After", "5");
    res.status(503).json({ error: "AI explanations are busy. Please try again shortly." });
    return;
  }
  // Reviewed CV facts are transient, never cached, deduplicated across users, or logged.
  const controller = new AbortController();
  const onClose = () => { if (!res.writableEnded) controller.abort(); };
  res.once("close", onClose);
  activeRequests++;
  try {
    const result = await provider(prepared.request, { signal: controller.signal });
    if (!res.destroyed) res.json(parseCvCareerExplanation(result.explanation, prepared));
  } catch (error) {
    if (!res.destroyed) res.status(error instanceof GlmPrivacyError ? 403 : error instanceof RunpodConfigurationError ? 503 : 502).json({
      error: error instanceof GlmPrivacyError ? error.message : "The AI career explanation is unavailable or could not be validated. Your CV review and profile are unchanged. Please retry.",
    });
  } finally {
    res.off("close", onClose);
    activeRequests--;
  }
});

router.post("/ai/explanations", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = CreateAiExplanationBody.strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a supported feature. CV Analysis accepts one detected skill name only; other features require a fictional sample." });
    return;
  }
  const input = parsed.data;
  if ((input.feature === "cv-analysis"
      ? input.sampleId !== undefined || input.cvDetectedSkill === undefined
      : input.sampleId === undefined || input.cvDetectedSkill !== undefined) ||
      (input.feature === "job-fit" ? !input.jobId : input.jobId !== undefined) ||
      (input.feature === "sdg-contribution" ? input.goal === undefined : input.goal !== undefined)) {
    res.status(400).json({ error: "CV Analysis needs only a detected skill name. Other features need a fictional sample; choose a listing only for Job Fit or a goal only for SDG Contribution." });
    return;
  }

  const client = req.ip || req.socket.remoteAddress || "unknown";
  if (!allowRequest(client)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many AI explanation requests. Please wait a minute and try again." });
    return;
  }
  const key = JSON.stringify([input.feature, input.sampleId ?? null, input.jobId ?? null, input.goal ?? null, input.cvDetectedSkill ?? null]);
  let pending = inFlight.get(key);
  if (!pending && activeRequests >= MAX_ACTIVE_REQUESTS) {
    res.setHeader("Retry-After", "5");
    res.status(503).json({ error: "AI explanations are busy. Please try again shortly." });
    return;
  }

  if (!pending) {
    activeRequests += 1;
    const controller = new AbortController();
    const promise = Promise.resolve().then(async () => {
      const example = await prepare(input);
      const result = await provider({ instruction: example.instruction, context: example.context, json: example.json }, { signal: controller.signal });
      const parsed = parseFeatureAnswer(result.explanation, example);
      return CreateAiExplanationResponse.parse({
        explanation: parsed.explanation,
        ...(parsed.suggestions ? { suggestions: parsed.suggestions } : {}),
        sampleLabel: example.sampleLabel, contextSummary: parsed.contextSummary,
        evidence: parsed.evidence, synthetic: example.synthetic, finalAnswerOnly: true,
      });
    }).finally(() => {
      activeRequests -= 1;
      inFlight.delete(key);
    });
    pending = { promise, controller, users: 0 };
    inFlight.set(key, pending);
  }
  const entry = pending;
  entry.users++;
  let detached = false;
  const detach = () => {
    if (detached) return;
    detached = true;
    entry.users--;
    // One disconnected waiter must not cancel work still needed by another.
    if (!res.writableEnded && entry.users === 0) entry.controller.abort();
  };
  res.once("close", detach);
  try {
    const result = await entry.promise;
    if (!res.destroyed) res.json(result);
  } catch (error) {
    if (res.destroyed) return;
    if (error instanceof GlmPrivacyError) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof GlmRequestError) {
      const hint = error.status === 401 || error.status === 403
        ? "Check GLM_API_KEY and endpoint permissions."
        : error.stage === "timeout"
          ? "The queue or worker exceeded the request deadline. No replacement job was submitted."
          : "The job failed, was rate-limited, or returned an invalid final answer. No automatic fallback was used.";
      res.status(502).json({ error: `GLM explanation unavailable. ${hint}` });
    } else if (error instanceof AiContextError) {
      res.status(error.status).json({ error: error.message });
    } else if (error instanceof RunpodConfigurationError) {
      res.status(503).json({ error: error.message });
    } else if (error instanceof RunpodRequestError && error.status !== undefined) {
      const step = error.stage === "model-list" ? "model discovery" : "chat completion";
      const hint = error.status === 401 || error.status === 403
        ? "Check RUNPOD_LLM_API_KEY and endpoint access permissions."
        : error.status === 404
          ? "Check the OpenAI-compatible base URL and deployed model name."
          : "Check endpoint readiness and retry shortly.";
      res.status(502).json({ error: `Runpod ${step} returned HTTP ${error.status}. ${hint}` });
    } else if (error instanceof RunpodRequestError) {
      res.status(502).json({ error: "Runpod could not be reached or returned an invalid response. Check endpoint readiness and try again." });
    } else {
      res.status(502).json({ error: "The AI provider could not complete a validated explanation. Please try again shortly." });
    }
  } finally {
    res.off("close", detach);
    detach();
  }
});

return router;
}

export default createAiRouter();
