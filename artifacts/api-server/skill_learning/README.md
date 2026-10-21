# Skill Learning Recommendation Engine

Python 3.11 / FastAPI / Pandas / PostgreSQL / ChromaDB / Sentence Transformers.

This service consumes an existing skill-analysis JSON object. It never receives CV files, modifies the CV analysis engine, saves a user's analysis, or changes saved learner proficiency.

## API

- `POST /api/recommend-courses`
- `POST /api/learning-roadmap`
- Swagger: `/api/learning/docs`
- ReDoc: `/api/learning/redoc`
- OpenAPI: `/api/learning/openapi.json`
- Health/readiness: `/api/learning/healthz`

The existing Express API continues to serve all other API paths. The artifact's managed `Skill Learning Engine` service owns these more-specific routes.

Example:

```bash
curl -X POST http://localhost:80/api/recommend-courses \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "123",
    "analysis": {
      "technical_skills": ["Python", "SQL", "Docker", "AWS"],
      "soft_skills": ["Communication"],
      "missing_skills": ["Docker", "AWS"],
      "skill_scores": {"Python": 85, "SQL": 65, "Docker": 20, "AWS": 10},
      "candidate_level": "early-career",
      "career_path": "Cloud engineering"
    },
    "limit": 12
  }'
```

For a roadmap, send the same `analysis` to `/api/learning-roadmap`, with optional `courses_per_skill` (1–5, default 3) and `hours_per_week` (1–40, default 5).

`user_id` is compatibility input only. It is not used as an authentication or ownership claim and is never saved or echoed. There is no user-history API to leak another learner's analysis.

## Requirement-by-requirement implementation

| Specification lines | Implementation |
|---|---|
| 1–19: consume existing analysis; do not rebuild it | `models.py` accepts its JSON output; existing CV/analysis code is unchanged. Missing scores are not fabricated. |
| 21–29: reference datasets | 13,783 usable rows from the supplied combined Coursera/edX catalog, out of 13,793. The archive contains no Udemy or resume-screening dataset; no such records are claimed. Other archive files overlap the combined catalog or contain additional product types and are not silently merged. |
| 31–60: extract targets, search, rank, roadmap | `engine.py`, `search.py`, `roadmap.py`. Missing skills, supplied scores, skill groups and career path inform results. |
| 62–71: difficulty thresholds | `<60` beginner, `60–80` intermediate, `>80` advanced. Missing skills without scores use beginner; candidate seniority never invents a maturity score. |
| 73–78: recommendation groups | Technical/soft groups use the analysis labels. Certificate-program references use the catalog's program type and certificate URL; other career interests use career-development. No certificate award is promised. |
| 80–85: semantic matching | Local, pinned `all-MiniLM-L6-v2` sentence-transformer embeddings of titles, skills and descriptions; Chroma cosine search. No standalone learning outcomes are supplied, so none are invented. |
| 87–94: backend stack | All six requested technologies are used. PostgreSQL stores the public catalog; Chroma stores derived course vectors. |
| 96–159: two POST APIs | FastAPI routes and generated workspace API contract/types/hooks. Validation failures return 400; unavailable/busy service returns 503 with Retry-After. |
| 162–168: foundations, dependencies, months, duration | Lowest scores first, with explicit planning dependencies taking precedence. Advanced courses are ineligible for beginner skill targets. Phases have month/end-month and estimated hours; recommendations after the first course are alternatives, not extra mandatory workload. |
| 197–205: modular code, schema, Swagger | Separate models, repository, embeddings, search, recommendation and roadmap modules. Drizzle schema in `lib/db/src/schema/skill-learning.ts`; Swagger and ReDoc paths above. |
| 207: students / early-career | Missing skills start at beginner. Default workload is 5 hours/week, adjustable; technical popularity does not suppress all soft-skill recommendations because skill-target results are interleaved. |

## Ranking and planning

Chroma retrieves up to 80 semantically close courses per target. Relevance is cosine similarity plus a capped exact-skill-tag boost. Rank score weights: relevance 70%, difficulty fit 15%, source rating 10%, learning priority 5%. A missing rating is neutral, not an invented numeric rating. Results cover different target skills before filling additional results for the same skill.

Dependencies are reviewable planning assumptions in `roadmap.py`, not provider requirements. They only reorder skills already present in the input targets. They do not assert that omitted prerequisite skills are missing.

edX numeric duration is an estimate from the supplied preprocessing's weeks × weekly effort formula. Coursera's units are not established; those courses use explicitly labelled workload assumptions (project 2h, courses 12/24/40h by difficulty, program 80h). No duration is presented as a completion guarantee. Four planning weeks form a month. Confirm course workload with the provider.

## Data and privacy

- Public source projection: `src/data/skill_learning_catalog.json.gz`.
- PostgreSQL: `skill_learning_courses` (`id`, `catalog_fingerprint`, `payload`).
- Dataset/model version changes get a fresh Chroma collection.
- Course embeddings, model download cache, and derived Chroma files: ignored `generated-artifacts/skill-learning/`.
- Only public catalog rows are seeded on startup when the deployed catalog version is absent. **No startup schema DDL**. Development schema is registered with Drizzle; production schema follows the existing Publish migration process.
- Analysis text, skill queries, user identifiers and query embeddings are request-only; no request bodies are logged.
- The health route reports `ready: false` until indexing finishes. Recommendations return 503 during initialization or dependency failure; there is no fake lexical fallback.
- The first cold start may take several minutes to download the pinned public model and index all records. Subsequent starts reuse the derived index when available.

The dataset is historical and includes multiple languages. URLs, prices, ratings, prerequisites, licenses, availability and rankings have not been independently validated. The English-focused embedding model may perform worse on non-English records. No hiring probability or proficiency increase is generated.

## Development commands

From the workspace root:

```bash
UV_PROJECT_ENVIRONMENT=.pythonlibs uv sync --frozen
PYTHONPATH=artifacts/api-server UV_PROJECT_ENVIRONMENT=.pythonlibs uv run --no-sync python -m unittest skill_learning.test_engine -v
```

Explicit idempotent public-data ingestion/index preparation (schema must already exist):

```bash
PYTHONPATH=artifacts/api-server UV_PROJECT_ENVIRONMENT=.pythonlibs uv run --no-sync python -m skill_learning.ingest --index
```

Use the managed workflow `artifacts/api-server: Skill Learning Engine` to run the API; it supplies `PORT`. These endpoints are backend-only in this request and do not replace or mutate the learner's saved My Profile roadmap/progress.
