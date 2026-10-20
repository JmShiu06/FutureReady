import { Router, type IRouter } from "express";
import {
  ListCareerSkillsResponse,
  MatchCareersBody,
  MatchCareersResponse,
} from "@workspace/api-zod";
import { careerDataset, matchSkills, SCORING } from "../lib/careerMatcher";

const router: IRouter = Router();

router.get("/career/skills", (_req, res): void => {
  res.json(ListCareerSkillsResponse.parse({ skills: careerDataset.allSkills }));
});

router.post("/career/match", (req, res): void => {
  const parsed = MatchCareersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:
        "Provide 1 to 50 skills as text, each up to 60 characters, e.g. { \"skills\": [\"Python\", \"SQL\"] }.",
    });
    return;
  }

  const { normalizedSkills, unrecognizedSkills, matches } = matchSkills(
    careerDataset,
    parsed.data.skills,
  );

  if (normalizedSkills.length === 0) {
    res.status(400).json({ error: "Enter at least one skill that is not blank." });
    return;
  }

  res.json(
    MatchCareersResponse.parse({
      matches,
      normalizedSkills,
      unrecognizedSkills,
      scoring: SCORING,
      source: careerDataset.source,
    }),
  );
});

export default router;
