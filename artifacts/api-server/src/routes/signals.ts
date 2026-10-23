import { Router, type IRouter } from "express";
import { GetAiAnnouncementsResponse, GetSkillFrequenciesResponse } from "@workspace/api-zod";
import { aiAnnouncementService } from "../lib/aiAnnouncements";
import { getSkillFrequencies } from "../lib/skillFrequencies";

const router: IRouter = Router();

router.get("/signals/ai-announcements", async (req, res): Promise<void> => {
  try {
    const result = await aiAnnouncementService.get();
    GetAiAnnouncementsResponse.parse(result);
    res.json(result);
  } catch (error) {
    req.log.warn({ error: error instanceof Error ? error.message : "Unknown source error" }, "AI announcement retrieval failed");
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
    res.status(502).json({ error: "The Ministry of Digital page could not be refreshed. Any earlier retrieved copy was kept." });
  }
});

router.get("/signals/skill-frequencies", (_req, res): void => {
  const result = getSkillFrequencies();
  GetSkillFrequenciesResponse.parse(result);
  res.json(result);
});

export default router;
