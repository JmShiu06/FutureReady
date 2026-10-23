import { Router, type IRouter } from "express";
import { GetAiAnnouncementsResponse, GetSkillFrequenciesResponse } from "@workspace/api-zod";
import { aiAnnouncementService, AiAnnouncementSourceUnavailableError, LISTING_URL } from "../lib/aiAnnouncements";
import { getSkillFrequencies } from "../lib/skillFrequencies";
import { arxivSignals } from "../lib/arxivSignals";

const router: IRouter = Router();
router.get("/signals/ai-research", async (_req, res) => { res.json(await arxivSignals.get()); });
router.post("/signals/ai-research/refresh", async (_req, res) => { res.json(await arxivSignals.refresh()); });

router.get("/signals/ai-announcements", async (req, res): Promise<void> => {
  try {
    const result = await aiAnnouncementService.get();
    GetAiAnnouncementsResponse.parse(result);
    res.json(result);
  } catch (error) {
    req.log.warn({ error: error instanceof Error ? error.message : "Unknown source error" }, "AI announcement retrieval failed");
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
    GetAiAnnouncementsResponse.parse(result);
    res.json(result);
  } catch (error) {
    req.log.warn({ error: error instanceof Error ? error.message : "Unknown source error" }, "AI announcement refresh failed");
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
