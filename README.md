# FutureReady Workforce

Career exploration and learning-planning decision support, not hiring decisions, a forecast, professional advice or proof of qualifications. The existing warm brown/cream UI and saved skills/completion model are retained.

## Six-feature evidence matrix

| Required feature | Working surface and implementation | Evidence and limit |
| --- | --- | --- |
| Skills/current potential intake and context | My profile: CV review/grading or manual skill form; optional experience/interests, hours/week and MYR budget | Self-report, not verified qualifications. Context stays local and now survives reload. CV-only Skill analysis is separate from form-only matching. |
| Updatable AI/job signals | Market/Careers: Future Skills Radar + DOSM posting levels and two-quarter changes | First-party OpenAI RSS titles/descriptions and official DOSM workbook; dates, URLs, staleness and explicit heuristic mappings. No news-to-job-loss claim. |
| Ranked roles and gaps | Future-role planning cards in Market and Careers, with direct Build/Resume roadmap | Unchanged exact-name overlap, separate posting/trend, task-scenario and bounded AI components; full missing names and source links are inspectable. |
| Personalised ordered learning | Learning roadmap for the selected reviewed MyCOL role; constraints, shared scenario/evidence, weekly packing and completion | Four reviewed OpenLearn resources plus the existing three exact technical resources; unsupported skills receive bounded exercises, not invented courses. Shared course time counted once. Optional completion window flags infeasibility. |
| SDG explanations for roles and skills | Role cards/details, planning cards, CV result cards and learning steps | Specific UN target, duty reference, skill-specific exercise, date and limitations. Conditional project relevance is not an official occupational crosswalk or measured impact. CV title-only matches explicitly identify their pooled duty reference, not a verified title mapping. |
| Multiple futures | Shared Moderate/Fast selector; independent synthetic AI A/B and DOSM A/B selectors | Fixed profile and posting inputs can be held constant while AI evidence changes. Estimates are bounded app-authored assumptions, not validated forecasts. |

## Isolated synthetic journey (no real profile overwritten)

1. Save a form-only profile in **My profile** with skills, experience/interests, learning hours and budget. Reload to confirm the intake persists.
2. Click **Try isolated synthetic demo** in Market/Careers (or the equivalent My profile button). Demo profile, targets, completion and roadmap changes live in a separate temporary workspace. Exit restores the original saved workspace. Reload discards the temporary demo rather than persisting it over the real profile.
3. Hold **Signal source = Synthetic snapshot A** and **scenario = Fast**. Change only **AI capability evidence = Synthetic AI A/B**. Compare role-score AI components, skill priorities, full gaps and **Review recommendation changes**.
4. Compare Moderate/Fast. Choose an eligible role with its **Build my learning roadmap** button. Scenario and evidence selections carry between Market, Careers and Roadmap during the session.
5. Mark a milestone complete, change hours/scenario, and check completion is retained. Inspect resource links, exact partial coverage, provider/app time basis, costs, prerequisites, SDG explanations and weekly schedule. A one-week requested window should be flagged infeasible when the workload exceeds capacity.
6. Exit demo and confirm the real profile and original progress return. CV analysis can be tested separately with a **new fictional text fixture only**: `Fictional Test Applicant`, a `Skills` heading, then `Python` and `SQL`. Upload, grade, apply, accept **Save and open Skill analysis**, review selected skill names, and explicitly consent. Navigation never triggers inference automatically. Do not use any existing person's CV for a demo.

## Public AI capability feed and change review

`GET /api/signals/ai-capabilities` reads [OpenAI News RSS](https://openai.com/news/rss.xml) with a six-hour TTL and a persisted last validated snapshot. `POST /api/signals/ai-capabilities/refresh` requests a bounded refresh, coalesced and limited to at most one attempt/minute. Only dated same-origin source links and recognised recent title categories are eligible; unknown categories do not become evidence. No paid API is involved.

`lib/workforce-evidence/src/ai-capabilities.ts` contains the reviewable mapping: coding-related announcements adjust emphasis on routine drafting, monitoring and evaluation; reasoning announcements adjust critical thinking/problem framing/decisions; safety announcements motivate monitoring/evaluation, with baseline writing held stable. These are **app interpretations of announcement presence**, not extracted benchmarks or observed Malaysian demand. Facts remain separately listed with their URL/date and source summary. The planning horizon is an explicitly assumed 12 months; uncertainty is high. Source inclusion uses a 180-day window. Repeated announcements cannot multiply a weight.

Individual adjustments are bounded −6 to +8 in the current catalogue, scaled by Moderate ×0.5 / Fast ×1. The role AI component is the mean over documented skills (unmapped skills add zero); missing-skill priorities receive the corresponding skill adjustment. Zero is not evidence that an unmapped skill is stable: unmapped means **unknown**. The displayed before/after recommendation summary exposes changed outputs; the source-change summary lists added/removed entries.

Both AI and DOSM validated public snapshots are now stored in the existing PostgreSQL `public_trend_snapshots` history table with fingerprints and save dates. No CV/profile data enters this table. A failed source retrieval or durable write retains the last validated snapshot and exposes a warning. History rows preserve prior public evidence; recommendations do not delete completed milestones. No startup-time production DDL or deployment changes were added.

## Domain 1 demonstration

1. Open **Market & AI impact → Labour market → Future-role planning priorities**.
2. Select **Synthetic snapshot A**, then **Synthetic snapshot B**. Both use exactly the same fictional skill names. Counts/dates are labelled synthetic; neither input replaces your saved profile or official observations.
3. Compare the two scenario columns and switch **Moderate/Fast AI disruption**. Inspect every component, task assumption and missing-skill priority. Existing occupation-overlap scores remain separate and unchanged.
4. Expand **Complete fictional HR pathway** for a read-only, ordered pathway and a 5-hour/week, MYR 0 learning-content budget schedule. It includes verified OpenLearn material and explicitly authored exercises, not 22 invented courses.
5. For your own plan, select an eligible occupation in Careers & jobs, build its roadmap, enter weekly hours and budget, and optionally switch the roadmap planning scenario. Completion is not proficiency; skill updates still require confirmation. Switching scenario changes displayed order, not stored completion.

All generated demonstration records remain clearly marked. Do not use real personal information for a judging demo. Source-backed role descriptions and fictional signal values are different kinds of evidence.

## Public signals and refresh

Normal mode uses DOSM's official **Job Market Insights, Table 2** online job-offering counts. The initial bundled fallback contains 2026-Q1/Q2. These are broad major-occupation groups, not an estimate of all vacancies or individual skill demand. Two-quarter changes are volatile and can be seasonal.

- [DOSM Q2 2026 release](https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026), published 18 August 2026.
- [Official source workbook](https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=20742).
- `GET /api/dosm/job-market-insights`: current validated snapshot, hydrated from PostgreSQL with a six-hour refresh TTL.
- **Refresh DOSM job-posting signals** / `POST /api/dosm/job-market-insights/refresh`: checks recent quarterly official release pages, reads the public XLSX Table 2, requires two complete quarters, recognised labels and reconciled totals, then replaces the cached snapshot atomically. No LLM call occurs. Requests are coalesced and limited to one attempt/minute. Publication dates after refresh refer to the retrieved workbook, including retrospective values. `reviewedAt` remains the parser/source-mapping review date, not a new human review.
- On failure, the previous snapshot stays visible with a warning. No fictional fallback is inserted. A server restart hydrates the last schema-validated durable public snapshot; the bundled reviewed snapshot is used only if no durable snapshot is available. The existing monthly OpenDOSM refresh remains separate.
- New quarters can change broad-group levels, quarter-to-quarter direction, planning ranks and learning priorities. They do **not** change saved skills, overlap scores, completed steps, O*NET content or resource prices. If DOSM changes workbook labels/layout, manual parser review is required.

The existing static global skill-mention dataset is not a time series and is **not** used as evidence of skill growth. National unemployment is context only, not an occupation-level ranking input. Ministry AI announcements remain qualitative context, not measured task-exposure coefficients.

## Transparent calculations

All choices below are app-authored planning assumptions, not fitted parameters:

- Exact-name overlap = matched documented O*NET skills / documented skills × 100.
- Signal index = latest group offerings / largest latest count among Managers and Professionals × 100.
- Fractional change = (latest − previous) / previous.
- Trend index = clamp(50 + 50 × fractional change, 0–100). Missing/zero prior value uses a disclosed neutral 50, not manufactured growth.
- Planning baseline = 0.55 × overlap + 0.30 × signal index + 0.15 × trend index.
- Scenario suitability = clamp(baseline + adaptation weight × assumed adaptation relevance − automation weight × assumed routine share, 0–100).
- Moderate weights: adaptation 8, automation 6; Fast: adaptation 24, automation 22. Per-role task assumptions/rationales are inspectable in the UI and `lib/workforce-evidence/src/planning.ts`. These are workshop assumptions, not measured exposure or a claim of future job loss.
- Missing-skill priority = clamp(12 × O*NET importance + 0.2 × (0.7 × signal index + 0.3 × trend index) + scenario skill bonus, 0–100).
- Systems/critical-thinking/monitoring/programming/complex-problem skills receive Moderate +4 / Fast +18. Communication/negotiation/instructing skills receive Moderate +8 / Fast +5. Other skills +0. Pattern matches and tie-breaks are inspectable in the pure calculation module.
- Within an already selected roadmap, the broad-group signal is constant across its skills, so ordering uses 12 × importance + scenario bonus. This does not reinterpret a proficiency self-rating as an O*NET assessment.

Source-backed MyCOL occupation scope and O*NET 31.0 US skill evidence remain distinct from Malaysian job-market observations. A broad-group posting signal is weak evidence for an individual role and no evidence of growth in a named skill.

## Actionable learning without fabricated courses

- Existing exact verified technical coverage (Python, SQL, AWS) is retained; no broad “Programming means Python course” substitution.
- New reviewed first-party OpenLearn resources: **Effective communication in the workplace** (24 hours provider-stated full-course time; explicit active-listening coverage), and **Managing and managing people** (8 hours provider-stated; published time-management learning outcome). Partial coverage is disclosed, not mastery. Content reviewed 2026-10-23.
- Additional first-party resources reviewed 2026-10-23: [Making decisions](https://www.open.edu/openlearn/money-business/leadership-management/making-decisions/content-section-0) (4 hours, provider-stated; decision processes/risk), and [Working in groups and teams](https://www.open.edu/openlearn/money-business/leadership-management/working-groups-and-teams/content-section-0) (8 hours, provider-stated; team roles, management support and performance). Published learning outcomes are linked from the catalogue. Free content does not mean a free professional credential or zero internet/device cost. Shared course study is counted once, with separate app-estimated application exercises for subsequent covered skills.
- Other gaps receive bounded, role-context **self-directed practice**, with instructions, expected output and explicitly **app-estimated** hours. These are not provider courses, certificates, qualifications or observed outcomes. Unverified paid-course coverage/cost remains unknown.
- No required content purchase is not zero total cost: device/internet/tool costs and optional certificates may differ. Check the provider for current availability/terms.
- Roadmaps contain source links, review dates, coverage limits, prerequisites and cost caveats. Ordered remaining tasks are packed into the selected weekly capacity; long tasks span weeks, short ones share a week. No calendar deadline or completion guarantee is claimed.

## SDG evidence and limits

Existing reviewed clinical-nursing (3.8) and HR labour-relations (8.8) mappings retain their scope limits. All seven currently eligible reviewed occupations also have explicit **conditional project use cases** and each recommended skill/practice can expand the same target-plus-duty explanation:

- HR labour relations → 8.8; clinical care coordination → 3.8.
- Systems analysis, software, database administration and defensive cybersecurity → **16.6 only in the stated hypothetical accountable public-institution service project**, not generic IT work.
- Data-scientist subset → **17.18 only in the stated statistical-capacity/disaggregated-development-data use case**, not generic business analytics; the original target's 2020 deadline is disclosed.

UN targets ([3](https://sdgs.un.org/goals/goal3), [8](https://sdgs.un.org/goals/goal8), [16](https://sdgs.un.org/goals/goal16), [17](https://sdgs.un.org/goals/goal17)) and specific O*NET task pages are cited in the UI. Targets were adopted 2015-09-25; live duty-page publication dates are not asserted. Conditional examples reviewed 2026-10-23 are app interpretations, not new official MyCOL/UN classifications, general occupational mappings or measured/guaranteed impacts. Real-occupation evidence is not routed through fictional goal-only AI explanations.

## CV contract repair and privacy

The frontend and strict API schema allow selected **skill names and local extraction-limitation metadata**, plus an empty `languages: []` field for wire compatibility. Non-empty language input and extra narrative/proficiency fields are rejected by the backend. Only skill names enter the LLM context; extraction metadata remains local. No raw CV, name, contact details, language data, narrative or proficiency is added. Consent is still required and results remain non-persistent/no-store.

The explanation contract has six sections. Matching facts, factual strengths limits, certification/resource suggestions remain server-controlled; model prose cannot replace matching scores or allowlisted resource URLs. Model-authored definitions/gap/growth prose is rejected for unsupported resource/job claims, URLs, figures or proficiency claims. The visible generation action identifies **Qwen/Qwen3-4B**; the backend refuses generation if its resolved configured model differs. No provider default or Secret is changed. Offline tests use synthetic fixtures/mocks. The separately authorised browser check may submit exactly one fictional skill-list generation, never an existing profile/CV; its observed result must be reported separately from mock results.

The repaired schema and offline fixtures alone do not prove every real CV extraction/OCR case or live Qwen response succeeds. No existing person's CV/profile is authorised for testing; live results must be reported separately from offline checks.

## Running and verification

### Observed verification in this completion pass

- Backend: **146/146** tests passed. Frontend domain: **37/37** tests passed. Library/backend/frontend typechecks and the production frontend build passed.
- Public AI retrieval returned 24 validated recent items with no stale warning; DOSM returned validated 2026-Q1/Q2 posting observations. A separate Node process hydrated both from PostgreSQL with **zero network calls**, confirming durable rather than process-only cache recovery.
- In a clean fictional browser workspace, experience/interests/constraints and manual skills survived reload. Holding the profile and posting snapshot fixed while changing AI A→B preserved overlap but changed explained scores (for example, Data Professionals under Fast: 73 → 74.7). Moderate/Fast also changed priorities.
- The browser exposed and helped fix the planning-to-roadmap ID hand-off: reviewed MyCOL occupation IDs must be translated to canonical saved-roadmap IDs. A regression test covers every eligible reviewed role.
- The HR roadmap opened with 18 missing-skill steps, source/cost/time/SDG explanations and a one-week infeasibility warning. A completed Complex Problem Solving step remained complete after scenario/hour replanning and was omitted from the schedule. Ordinal card positions can change; completion identity does not. Exiting the isolated demo restored the original fictional form profile and its unbuilt real roadmap.
- The exact fictional text CV was extracted, Python/SQL graded, and the optional redirect accepted. Consent was initially unchecked. **Exactly one** live Qwen/Qwen3-4B request was made; HTTP **200**, approximately 9 seconds, six validated sections across Skill analysis and learning guidance. The request contained only `consent`, `data.skills`, empty `data.languages` and `data.extractionLimited`; the actual LLM context contained only selected skill names plus server-owned public reference facts. No raw CV, detected name, ratings, existing profile or real person's data was sent. No other AI request or generation retry occurred.
- Desktop and 390px views were checked. External course links were verified against first-party research/catalogue evidence and inspected in the UI; the browser did not enrol in courses or follow every provider link.

No blocker remains in that tested fictional text-CV journey. This is **not** proof that arbitrary PDF/scanned-CV OCR succeeds, that the scenario heuristics predict labour demand, or that SDG project examples are official occupational classifications. GitHub repository/judge access remains unverified. No Secrets/provider defaults or deployment configuration were changed; nothing was published.

Use the existing managed API and web workflows. For shell checks:

```sh
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/future-ready-workforce run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server exec sh -c 'tsx --test ../future-ready-workforce/src/domain/*.test.ts'
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/future-ready-workforce run build
```

The last build command supplies local build-only non-secret configuration; managed workflows supply their own routing. Do not paste credentials into terminal commands or documentation.

For a GitHub submission, review included files and remove private uploads/data before sharing. Keep source attribution and this explanation of synthetic versus official inputs. Repository visibility and judge access have **not** been verified. No publishing or deployment is performed by these instructions.
