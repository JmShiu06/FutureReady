import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  analyzeCareerPath,
  analyzeProfileSimilarity,
  analyzeResumeText,
  analyzeSkillGap,
} from "../lib/careerAnalysis";

const router: IRouter = Router();
const ResumeTextBody = z.object({
  resume_text: z.string().trim().min(1).max(200_000),
});
const SkillGapBody = ResumeTextBody.extend({
  target_role: z.string().trim().min(1).max(120),
});

function invalidBody(res: import("express").Response, message: string): void {
  res.status(400).json({ error: message });
}

router.post("/analyze-resume", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = ResumeTextBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Provide non-empty resume_text no longer than 200,000 characters.");
    return;
  }
  res.json(analyzeResumeText(parsed.data.resume_text));
});

router.post("/skill-gap-analysis", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = SkillGapBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Provide resume_text and a target_role no longer than 120 characters.");
    return;
  }
  const report = analyzeSkillGap(parsed.data.resume_text, parsed.data.target_role);
  if (!report) {
    res.status(404).json({ error: "The target role is not in the bundled dataset." });
    return;
  }
  res.json(report);
});

router.post("/career-path", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = ResumeTextBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Provide non-empty resume_text no longer than 200,000 characters.");
    return;
  }
  res.json(analyzeCareerPath(parsed.data.resume_text));
});

router.post("/profile-similarity", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = ResumeTextBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Provide non-empty resume_text no longer than 200,000 characters.");
    return;
  }
  res.json(analyzeProfileSimilarity(parsed.data.resume_text));
});

export default router;
