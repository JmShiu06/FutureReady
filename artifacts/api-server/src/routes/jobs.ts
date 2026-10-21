import { Router, type IRouter, type Request, type Response } from "express";
import {
  CalculateJobMatchScoresBody,
  CalculateJobMatchScoresResponse,
  FilterJobsQueryParams,
  FilterJobsResponse,
  GetJobParams,
  GetJobResponse,
  ListJobsQueryParams,
  ListJobsResponse,
  SearchJobsQueryParams,
  SearchJobsResponse,
} from "@workspace/api-zod";
import {
  jobProvider,
  type JobFilters,
} from "../services/job_provider";
import { z } from "zod";

const router: IRouter = Router();

function parseQuery(schema: z.ZodTypeAny, query: Request["query"]) {
  const input: Record<string, unknown> = { ...query };
  if (input.remote !== undefined) {
    if (input.remote === "true") input.remote = true;
    else if (input.remote === "false") input.remote = false;
    else return { success: false as const, error: "remote must be true or false" };
  }
  const parsed = schema.safeParse(input);
  return parsed.success
    ? { success: true as const, data: parsed.data as JobFilters }
    : { success: false as const, error: parsed.error.message };
}

async function list(
  req: Request,
  res: Response,
  querySchema: z.ZodTypeAny,
  responseSchema: z.ZodTypeAny,
): Promise<void> {
  const parsed = parseQuery(querySchema, req.query);
  if (!parsed.success) {
    req.log.warn({ error: parsed.error }, "Invalid job search filters");
    res.status(400).json({ error: typeof parsed.error === "string" ? parsed.error : "Invalid job search filters." });
    return;
  }
  const result = await jobProvider.listJobs(parsed.data);
  // Validate without transforming date strings into JS Date objects; the API
  // contract uses ISO calendar dates (`YYYY-MM-DD`).
  responseSchema.parse(result);
  res.json(result);
}

router.get("/jobs", async (req, res): Promise<void> => {
  await list(req, res, ListJobsQueryParams, ListJobsResponse);
});

router.get("/jobs/search", async (req, res): Promise<void> => {
  await list(req, res, SearchJobsQueryParams, SearchJobsResponse);
});

router.get("/jobs/filter", async (req, res): Promise<void> => {
  await list(req, res, FilterJobsQueryParams, FilterJobsResponse);
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "A valid job id is required." });
    return;
  }

  const job = await jobProvider.getJobDetails(params.data.id);
  if (!job) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  GetJobResponse.parse(job);
  res.json(job);
});

router.post("/jobs/match-score", async (req, res): Promise<void> => {
  const parsed = CalculateJobMatchScoresBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ error: parsed.error.message }, "Invalid job match request");
    res.status(400).json({ error: "Provide 1 to 50 candidate skills, each 1 to 60 characters." });
    return;
  }

  const scores = await jobProvider.matchJobs(
    parsed.data.candidateSkills,
    parsed.data.jobIds,
  );
  const result = {
    scores,
    scoringNote:
      "Dataset skill overlap: exact normalized skills matched / listed job skills x 100. This is not a probability of getting a job.",
  };
  CalculateJobMatchScoresResponse.parse(result);
  res.json(result);
});

export default router;
