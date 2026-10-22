import { Router, type IRouter } from "express";
import { CreateAiExplanationBody, CreateAiExplanationResponse } from "@workspace/api-zod";
import { generateLlmExplanation, RunpodConfigurationError, RunpodRequestError } from "../lib/runpod";
import { syntheticExplanationContext } from "../lib/aiExamples";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const MAX_ACTIVE_REQUESTS = 2;
export function createAiRouter(provider: typeof generateLlmExplanation = generateLlmExplanation): IRouter {
const router: IRouter = Router();
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

router.post("/ai/explanations", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = CreateAiExplanationBody.strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a supported AI feature and synthetic sample. Profile data and CV text are not accepted." });
    return;
  }

  const client = req.ip || req.socket.remoteAddress || "unknown";
  if (!allowRequest(client)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many AI explanation requests. Please wait a minute and try again." });
    return;
  }
  if (activeRequests >= MAX_ACTIVE_REQUESTS) {
    res.setHeader("Retry-After", "5");
    res.status(503).json({ error: "AI explanations are busy. Please try again shortly." });
    return;
  }

  activeRequests += 1;
  try {
    const example = syntheticExplanationContext(parsed.data.feature, parsed.data.sampleId);
    const result = await provider({ instruction: example.instruction, context: example.context });
    res.json(CreateAiExplanationResponse.parse({
      ...result, sampleLabel: example.sampleLabel, contextSummary: example.contextSummary,
      synthetic: true, finalAnswerOnly: true,
    }));
  } catch (error) {
    if (error instanceof RunpodConfigurationError) {
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
      res.status(502).json({ error: "Runpod could not complete the explanation. Please try again shortly." });
    }
  } finally {
    activeRequests -= 1;
  }
});

return router;
}

export default createAiRouter();
