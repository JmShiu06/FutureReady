# FutureReady Workforce

Career exploration and learning-planning decision support, not hiring decisions, a forecast, professional advice or proof of qualifications. The existing warm brown/cream UI and saved skills/completion model are retained.

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
- `GET /api/dosm/job-market-insights`: current validated in-process snapshot.
- **Refresh DOSM job-posting signals** / `POST /api/dosm/job-market-insights/refresh`: checks recent quarterly official release pages, reads the public XLSX Table 2, requires two complete quarters, recognised labels and reconciled totals, then replaces the cached snapshot atomically. No LLM call occurs. Requests are coalesced and limited to one attempt/minute. Publication dates after refresh refer to the retrieved workbook, including retrospective values. `reviewedAt` remains the parser/source-mapping review date, not a new human review.
- On failure, the previous snapshot stays visible with a warning. No fictional fallback is inserted. The cache is in process; a server restart restores the bundled reviewed snapshot until a successful refresh. The existing monthly OpenDOSM refresh remains separate.
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

The frontend and strict API schema allow only selected **skill names, language names and local extraction-limitation metadata**. The repaired backend now matches that contract rather than calling `.map()` on removed education/experience fields. Only skill/language names enter the LLM context; extraction metadata remains local. No raw CV, name, contact details, narrative or proficiency is added. Consent is still required and results remain non-persistent/no-store.

The explanation contract has six sections. Matching facts, factual strengths limits, certification/resource suggestions remain server-controlled; model prose cannot replace matching scores or the allowlisted fields. The visible generation action identifies **Qwen/Qwen3-4B**. Secrets/provider defaults were not changed. Automated tests use synthetic fixtures and a mock provider, not paid generation.

This repairs the confirmed schema mismatch; it does not prove every real CV extraction/OCR case succeeds or a live Qwen generation works. No real CV or live generation was used for verification.

## Running and verification

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
