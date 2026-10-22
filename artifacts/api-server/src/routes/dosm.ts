import { Router, type IRouter } from "express";
import {
  GetDosmOccupationEmploymentSearchResponse,
  GetDosmJobMarketInsightsResponse,
  GetDosmLabourForceResponse,
  RefreshDosmLabourForceResponse,
} from "@workspace/api-zod";
import { z } from "zod";
import { validateDosmJobMarketInsightsSnapshot } from "../data/dosm-jmi-2026";
import { dosmLabourForceService } from "../lib/dosmData";
import { searchDosmOccupationEmployment } from "../services/occupation-employment-search";

const router: IRouter = Router();

const monthFilterSchema = z.object({
  fromMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  toMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});
const occupationSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

router.get("/dosm/labour-force", async (req, res): Promise<void> => {
  const parsed = monthFilterSchema.safeParse({ ...req.query });
  if (!parsed.success) {
    res.status(400).json({ error: "Use valid YYYY-MM values for the optional month filters." });
    return;
  }
  if (
    parsed.data.fromMonth && parsed.data.toMonth &&
    parsed.data.fromMonth > parsed.data.toMonth
  ) {
    res.status(400).json({ error: "The start month must not be after the end month." });
    return;
  }

  try {
    const result = await dosmLabourForceService.get(parsed.data);
    GetDosmLabourForceResponse.parse(result);
    res.json(result);
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown source error" },
      "OpenDOSM labour-force request failed",
    );
    res.status(502).json({
      error: "Official DOSM data is unavailable and no validated cached copy exists.",
    });
  }
});

router.get("/dosm/occupation-employment-search", async (req, res): Promise<void> => {
  const parsed = occupationSearchQuerySchema.safeParse({ ...req.query });
  if (!parsed.success) {
    res.status(400).json({ error: "The optional occupation keyword must be 100 characters or fewer." });
    return;
  }

  try {
    const labourForce = await dosmLabourForceService.get();
    const latestObservation = labourForce.observations.at(-1);
    if (!latestObservation) {
      throw new Error("OpenDOSM returned no labour-force observations.");
    }

    const result = {
      ...searchDosmOccupationEmployment(parsed.data.q ?? ""),
      nationalContext: {
        latestObservation,
        metadata: labourForce.metadata,
        isStale: labourForce.isStale,
        warning: labourForce.warning,
      },
    };
    GetDosmOccupationEmploymentSearchResponse.parse(result);
    res.json(result);
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown source error" },
      "DOSM occupation-employment search failed",
    );
    res.status(502).json({
      error: "Official DOSM national context is unavailable and no validated cached copy exists.",
    });
  }
});

router.get("/dosm/job-market-insights", (_req, res): void => {
  try {
    const result = validateDosmJobMarketInsightsSnapshot();
    GetDosmJobMarketInsightsResponse.parse(result);
    res.json(result);
  } catch {
    res.status(500).json({
      error: "The reviewed DOSM job-market snapshot failed validation.",
    });
  }
});

router.post("/dosm/refresh", async (req, res): Promise<void> => {
  try {
    const result = await dosmLabourForceService.refresh();
    RefreshDosmLabourForceResponse.parse(result);
    res.json(result);
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown source error" },
      "OpenDOSM refresh failed",
    );
    res.status(502).json({
      error: "OpenDOSM could not be refreshed. Any existing cached data was retained.",
    });
  }
});

export default router;
