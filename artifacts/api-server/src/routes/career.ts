import { Router, type IRouter } from "express";
import multer from "multer";
import {
  ExtractCvSkillsResponse,
  ListCareerSkillsResponse,
  MatchCareersBody,
  MatchCareersResponse,
} from "@workspace/api-zod";
import { careerDataset, matchSkills, SCORING } from "../lib/careerMatcher";
import { CvError, extractCvSkills, MAX_CV_BYTES } from "../lib/cvSkillExtractor";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 0, parts: 2 } });
let activeParses = 0;

router.post("/career/cv-skills", (req, res, next) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (error) {
      const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? "Your CV exceeds the 5 MB limit." : "Upload one PDF, DOCX or TXT file using the file field." });
      return;
    }
    next();
  });
}, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!req.file) {
    res.status(400).json({ error: "Choose a PDF, DOCX or TXT file first." });
    return;
  }
  if (activeParses >= 2) {
    delete req.file;
    res.status(503).json({ error: "CV processing is busy. Please try again shortly." });
    return;
  }
  activeParses++;
  try {
    const result = await extractCvSkills(req.file.buffer, req.file.originalname);
    res.json(ExtractCvSkillsResponse.parse(result));
  } catch (error) {
    // Deliberately do not log parser exceptions: they can contain document text.
    res.status(error instanceof CvError ? error.status : 422).json({
      error: error instanceof CvError ? error.message : "Your CV could not be processed. Try another file or enter skills manually.",
    });
  } finally {
    activeParses--;
    delete req.file;
  }
});

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
