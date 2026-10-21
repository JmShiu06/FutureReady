import { Router, type IRouter } from "express";
import { MatchOccupationEvidenceBody, MatchOccupationEvidenceResponse } from "@workspace/api-zod";
import { getOccupationSources, IMPORTANCE_THRESHOLD, matchOccupations } from "../lib/occupationEvidence";

const router: IRouter = Router();

const SELECTION_RULE =
  `Documented skills are O*NET skills rated at least ${IMPORTANCE_THRESHOLD} on O*NET's 1-5 Importance scale, ` +
  "excluding ratings O*NET flags as low precision (importance) or not relevant (level). This threshold is a SkillShift selection rule, not an O*NET classification.";
const SCORING =
  "Documented skill overlap: exact normalized profile skill names matched / documented O*NET skills. " +
  "It is not personal proficiency readiness, a hiring probability or a measure of Malaysian demand.";

router.post("/occupations/match", (req, res): void => {
  const parsed = MatchOccupationEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Provide up to 50 skills as text, each 1 to 60 characters, e.g. { \"skills\": [\"Critical thinking\"] }.",
    });
    return;
  }
  const result = {
    ...matchOccupations(parsed.data.skills),
    selectionRule: SELECTION_RULE,
    scoring: SCORING,
    sources: getOccupationSources(),
  };
  // Validate without transforming the response, as the jobs routes do.
  MatchOccupationEvidenceResponse.parse(result);
  res.json(result);
});

export default router;
