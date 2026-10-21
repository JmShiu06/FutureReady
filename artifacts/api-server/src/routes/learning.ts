import {
  GenerateLearningRoadmapBody,
  GenerateLearningRoadmapResponse,
  RecommendCoursesBody,
  RecommendCoursesResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import {
  generateLearningRoadmap,
  recommendCourses,
} from "../lib/skillLearningRecommendation";

const router: IRouter = Router();

router.post("/recommend-courses", (req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = RecommendCoursesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide valid analysis skill fields and scores from 0 to 100." });
    return;
  }
  // user_id is accepted for existing callers, but intentionally neither stored nor logged.
  const response = RecommendCoursesResponse.parse(
    recommendCourses(parsed.data.analysis, parsed.data.limit),
  );
  res.json(response);
});

router.post("/learning-roadmap", (req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = GenerateLearningRoadmapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide valid analysis skill fields and scores from 0 to 100." });
    return;
  }
  const response = GenerateLearningRoadmapResponse.parse(
    generateLearningRoadmap(parsed.data.analysis, parsed.data.courses_per_skill),
  );
  res.json(response);
});

export default router;
