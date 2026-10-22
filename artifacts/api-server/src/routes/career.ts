import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import {
  ExtractCvSkillsResponse,
  ListCareerSkillsResponse,
  MatchCareersBody,
  MatchCareersResponse,
} from "@workspace/api-zod";
import { careerDataset, matchProfileSkills, SCORING } from "../lib/careerMatcher";
import { matchCvCareerSkills } from "../lib/cvCareerCatalogue";
import { CvError, CV_PROCESSING_TIMEOUT_MS, extractCvSkills, MAX_CV_BYTES } from "../lib/cvSkillExtractor";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 0, parts: 2 } });
let activeParses = 0;

router.post("/career/cv-skills", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  upload.single("file")(req, res, (error: unknown) => {
    if (error) {
      const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? "Your CV exceeds the 5 MB limit." : "Upload one PDF, DOCX, TXT, JPG, JPEG or PNG file using the file field." });
      return;
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Choose a PDF, DOCX, TXT, JPG, JPEG or PNG file first." });
    return;
  }
  if (activeParses >= 2) {
    delete req.file;
    res.status(503).json({ error: "CV processing is busy. Please try again shortly." });
    return;
  }
  activeParses++;
  const abortController = new AbortController();
  const abort = () => abortController.abort();
  const timeout = setTimeout(
    () => abortController.abort(new DOMException("CV processing timed out", "TimeoutError")),
    CV_PROCESSING_TIMEOUT_MS,
  );
  req.once("aborted", abort);
  res.once("close", () => {
    if (!res.writableEnded) abort();
  });
  try {
    const result = await extractCvSkills(req.file.buffer, req.file.originalname, abortController.signal);
    if (!res.destroyed) res.json(ExtractCvSkillsResponse.parse(result));
  } catch (error) {
    // Deliberately do not log parser exceptions: they can contain document text.
    if (!res.destroyed && (!abortController.signal.aborted || abortController.signal.reason?.name === "TimeoutError")) {
      res.status(error instanceof CvError ? error.status : 422).json({
        error: error instanceof CvError ? error.message : "Your CV could not be processed. Try another file or enter skills manually.",
      });
    }
  } finally {
    clearTimeout(timeout);
    req.off("aborted", abort);
    activeParses--;
    delete req.file;
  }
});

router.get("/career/skills", (_req, res): void => {
  res.json(ListCareerSkillsResponse.parse({ skills: careerDataset.allSkills }));
});

function createMatchHandler(cvTitles: boolean): RequestHandler {
  return (req, res): void => {
  const parsed = MatchCareersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:
        "Provide 1 to 50 skills as text, each up to 60 characters, e.g. { \"skills\": [\"Python\", \"SQL\"] }.",
    });
    return;
  }

  const result = cvTitles ? matchCvCareerSkills(parsed.data.skills) : {
    ...matchProfileSkills(
    careerDataset,
    parsed.data.skills,
    ),
    scoring: SCORING,
    source: careerDataset.source,
  };
  const { normalizedSkills, unrecognizedSkills, skillMappings, matches } = result;

  if (normalizedSkills.length === 0) {
    res.status(400).json({ error: "Enter at least one skill that is not blank." });
    return;
  }

  res.json(
    MatchCareersResponse.parse({
      matches,
      normalizedSkills,
      unrecognizedSkills,
      skillMappings,
      scoring: result.scoring,
      source: result.source,
    }),
  );
  };
}

router.post("/career/match", createMatchHandler(false));
router.post("/career/cv-match", createMatchHandler(true));

export default router;
