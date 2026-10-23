import { Router, type IRouter } from "express";
import { GetAiAnnouncementsResponse, GetSkillFrequenciesResponse } from "@workspace/api-zod";
import { aiAnnouncementService, AiAnnouncementSourceUnavailableError, LISTING_URL } from "../lib/aiAnnouncements";
import { getSkillFrequencies } from "../lib/skillFrequencies";
import { arxivSignals } from "../lib/arxivSignals";

const router: IRouter = Router();
router.get("/signals/ai-research", async (_req, res) => { res.json(await arxivSignals.get()); });
router.post("/signals/ai-research/refresh", async (_req, res) => { res.json(await arxivSignals.refresh()); });

function logAnnouncementFailure(req: { log: { warn: (fields: unknown, message: string) => void } }, error: unknown, action: string) {
  const diagnostics = error instanceof AiAnnouncementSourceUnavailableError ? error.diagnostics : undefined;
  req.log.warn({
    error: error instanceof Error ? error.message : "Unknown source error",
    ...(diagnostics ? { upstream: diagnostics } : {}),
  }, action);
}

router.get("/signals/ai-announcements", async (req, res): Promise<void> => {
  try {
    const result = await aiAnnouncementService.get();
    const { sourceFailure, ...publicResult } = result;
    if (sourceFailure) {
      req.log.warn({ upstream: sourceFailure }, "AI announcement source returned a stale-data response");
    }
    GetAiAnnouncementsResponse.parse(publicResult);
    res.json(publicResult);
  } catch (error) {
    logAnnouncementFailure(req, error, "AI announcement retrieval failed");
    if (error instanceof AiAnnouncementSourceUnavailableError) {
      res.setHeader("Retry-After", String(error.retryAfterSeconds));
      res.status(502).json({
        error: "The official Ministry of Digital announcement listing is temporarily unavailable.",
        sourceStatus: error.sourceStatus,
        retryAfterSeconds: error.retryAfterSeconds,
        sourceUrl: LISTING_URL,
      });
      return;
    }
    res.status(502).json({ error: "Official announcements are unavailable and no earlier retrieved copy exists." });
  }
});

router.post("/signals/ai-announcements/refresh", async (req, res): Promise<void> => {
  try {
    const result = await aiAnnouncementService.refresh();
    const { sourceFailure: _sourceFailure, ...publicResult } = result;
    GetAiAnnouncementsResponse.parse(publicResult);
    res.json(publicResult);
  } catch (error) {
    logAnnouncementFailure(req, error, "AI announcement refresh failed");
    try {
      // A failed refresh starts the service's Retry-After window; get() serves
      // its in-memory copy without issuing another request to the Ministry.
      const stale = await aiAnnouncementService.get();
      const { sourceFailure: _sourceFailure, ...publicStale } = stale;
      if (stale.isStale) {
        GetAiAnnouncementsResponse.parse(publicStale);
        res.setHeader("Warning", '110 - "Response is stale"');
        res.json(publicStale);
        return;
      }
    } catch {
      // No earlier copy is available; keep the existing unavailable response.
    }
    if (error instanceof AiAnnouncementSourceUnavailableError) {
      res.setHeader("Retry-After", String(error.retryAfterSeconds));
      res.status(502).json({
        error: "The official Ministry of Digital announcement listing is temporarily unavailable.",
        sourceStatus: error.sourceStatus,
        retryAfterSeconds: error.retryAfterSeconds,
        sourceUrl: LISTING_URL,
      });
      return;
    }
    res.status(502).json({ error: "The Ministry of Digital page could not be refreshed. Any earlier retrieved copy was kept." });
  }
});

router.get("/signals/skill-frequencies", (_req, res): void => {
  const result = getSkillFrequencies();
  GetSkillFrequenciesResponse.parse(result);
  res.json(result);
});

export default router;
