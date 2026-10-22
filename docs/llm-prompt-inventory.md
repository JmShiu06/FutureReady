# FutureReady LLM inventory and prompt boundaries

## Repository audit — 2026-10-22

There is one active inference path:
`POST /api/ai/explanations` → `routes/ai.ts` → `lib/aiEvidence.ts`
→ `lib/runpod.ts:generateLlmExplanation` → OpenAI-compatible chat completions.
The old `/api/ai/task-exposure/explanation` returns 410 and does not call a model.

The request accepts a feature, fixed fictional sample ID, and (only where relevant)
a provider listing ID or SDG selector. Arbitrary profiles, CV text and extra fields
are rejected. No opening-page action initiates inference.

| Actual feature selector | Frontend entry | Server-owned input | Audit-baseline output and validation |
|---|---|---|---|
| `career-explorer` | `/careers` | Fictional skills, existing overlap/gaps, separate TalentCorp/O*NET evidence | Qualitative text; reasoning/figure/link checks |
| `cv-analysis` | `/cv-analysis`, `/profile` CV section | Fixed fictional CV excerpt and local skill detections | Qualitative text; no model-generated skill/evidence schema at baseline |
| `learning-roadmap` | `/profile?section=roadmap` | Fictional gaps, practice sequence and time/free-budget constraints | Qualitative text; no catalogue-ID references at baseline |
| `digital-twin` | `/profile?section=twin` | Fictional before/after confirmation and moderate/fast adoption assumptions | Qualitative text; actual saved progress is not sent |
| `task-exposure` | `/scenarios` | Fixed fictional task traits | Qualitative text; the person's interactive task check remains local |
| `market-trends` | `/trends` | Dated DOSM observations projected into deterministic directions | Qualitative text; authoritative figures retained server-side |
| `job-fit` | `/jobs`, `/jobs/:id` | Provider-returned description/requirements and fictional learner overlap | Qualitative text; existing provider has demo listings, not genuine vacancies |
| `sdg-contribution` | `/sdgs` | Shared source-supported thematic mappings | Qualitative text; unsupported mappings refused before inference |
| `profile-skills` | `/profile` | Fictional background/goal and dataset gap allowlist | Strict JSON skill/rationale suggestions; confirm, self-rate, add draft, separately save |

At baseline, task instructions were divided between `aiExamples.ts`,
appended strings in `aiEvidence.ts`, and the common system message in `runpod.ts`.
The provider already disables thinking, limits context/tokens/time, rejects
reasoning and truncation, and retains credentials server-side. The router has
validation, rate/concurrency limits, in-flight deduplication and safe errors.

## Deterministic paths, not LLM-powered

- `/api/career/cv-skills`: local document parsing/OCR and skill detection.
- `/api/analyze-resume`, `/api/skill-gap-analysis`, `/api/career-path`,
  `/api/profile-similarity`: existing local analysis and dataset matching.
- `/api/career/match`, `/api/occupations/match`, job match scores: existing formulas.
- Roadmap construction, completion, confirmation, persistence and twin calculations.
- Interactive AI Skill Check task selections: qualitative local rules, not a model.
- DOSM retrieval/statistics and SDG records: source data, not AI-produced evidence.

There is no independent AI-scenario endpoint: the twin explanation currently
includes the existing adoption assumptions. There are no genuine vacancies in
the current job provider, and the saved-profile Job Recommendations page is not a
genuine-vacancy AI recommendation engine. Actual private learning histories and
real uploaded CVs are not connected to RunPod.

## Maintained templates and current output validation

`lib/llmPrompts.ts` now owns the common system rules, every connected feature
template, and the separately maintained `AI_SCENARIO_INSTRUCTIONS` included in
the twin template. `runpod.ts` remains the only provider client; it constructs
system/user messages through that module. No new endpoint or API contract was added.

| Template selector | Model output | Server validation |
|---|---|---|
| `cv-analysis` | JSON `{explanation, skills: [{skill, evidence}]}` | Strict keys; canonical dataset membership; allowed local candidates; unique skills; exact CV substring that detects the same skill; no proficiency |
| `career-explorer` | Bounded qualitative text | Nonempty bounded prose, no JSON/code fences, invented figures, links or reasoning tags; authoritative match numbers remain server-rendered |
| `learning-roadmap` | JSON `{explanation, resources: [{resourceId, reason}]}` | Strict keys; unique IDs in the supplied, gap-relevant verified catalogue subset; bounded qualitative reasons; titles, providers, costs, durations and links rendered from original records |
| `digital-twin` | Bounded qualitative text | Same prose validation; template distinguishes fictional confirmation, unavailable real history and hypothetical adoption assumptions |
| shared AI-scenario instructions | Included in `digital-twin`, no independent route | Requires supplied assumptions/calculations; absent calculated effects are acknowledged rather than invented |
| `task-exposure` | Bounded qualitative text | Same prose validation; model receives only fixed fictional task traits, no unrelated profile, role or match fields |
| `market-trends` | JSON `{explanation, sourceIds}` | Strict keys; complete unique source-ID allowlist; server preserves observation dates, retrieval timestamp, stale warning and source links |
| `job-fit` | Bounded qualitative text | Same prose validation; listing selected server-side; demo provenance retained, missing listing refused; no new genuine-vacancy integration |
| `sdg-contribution` | Bounded qualitative text | Same prose validation; only source-supported mappings are supplied; unverified mappings rejected before inference |
| `profile-skills` | JSON `{suggestions: [{skill, rationale}]}` | Strict keys; unique dataset-gap allowlist; bounded qualitative reasons; no levels or automatic writes |

`lib/aiOutput.ts` parses the machine-readable model output before constructing
the unchanged public explanation envelope. CV candidates and exact quotes are
read-only context details, not automatic profile additions. Accepted catalogue
references become source cards using server-held catalogue facts. Model text
does not become stored observations, scores, course completion or source records.

Common rules address task boundaries, insufficient evidence, audience-appropriate
language, untrusted documents, fact/inference separation, no invented evidence,
exact formats, no reasoning traces and no state writes. Prose is limited to
2,400 characters; structured arrays, identifiers, evidence and rationale lengths
have their own bounds. Existing provider limits, thinking-disabled configuration,
privacy selectors, deduplication, rate limits, timeouts and safe errors remain.

These checks validate machine-readable references and format, not the truth of
every possible natural-language interpretation. Readers still need to review
AI-labelled explanations alongside authoritative source/context panels.

## Verification

- Full backend suite: 117 tests passed, including matching, CV/OCR, occupation
  evidence, DOSM calculations, job scoring and provider safeguards.
- Focused prompt/output/API checks additionally exercise all nine connected
  selectors, strict malformed-output rejection and provider-error fallback.
- Frontend domain suite: 17 tests passed, including progress, confirmation,
  persistence, profile isolation and deterministic calculations.
- Backend/frontend TypeScript checks and production builds passed.
- Existing frontend sourcemap and large-bundle warnings remain non-blocking.
- Automated inference responses are mocked; no live RunPod inference was needed
  for this prompt-improvement work. Previous live verification is not presented
  as new live validation of these revised templates.

Real-CV inference, actual saved learning-history inference, genuine vacancy
explanations and an independent AI-scenario route remain unconnected. Improving
prompts does not silently authorize those data flows or create those features.
