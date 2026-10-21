# FutureReady frontend milestone

This milestone is a frontend prototype for the Aiversecity Future-Ready Workforce domain, not a labour-market prediction system. It uses the existing React, TypeScript, Vite and Wouter application and its warm brand theme.

## Data and trust boundaries

- New profile, role, market-history, organisation, cohort, course and scenario records are fictional demonstration data.
- Readiness is an illustrative skills-coverage calculation, not validated career readiness, employability or probability of being hired.
- Demand examples are independent of readiness. No live demand evidence or economic forecasts are available in this milestone.
- A source URL or course URL of `null` means unavailable/unverified. Never replace it with an invented link.
- UN goal definitions do not validate a role-to-SDG mapping. The sample mappings require independent evidence and impact assessment.
- Scenario assumptions are manually authored discussion prompts, stored separately from observed evidence.
- No CV file processing, AI calls, new backend endpoints, database changes or deployment changes are introduced by the new prototype.
- Existing job-search services and the prior dataset-matching implementation are retained. These are separate from the new demo service; a backend outage must not disable the new frontend tools.

## Deterministic prototype methodology

For each skill required by a sample role:

1. Normalise skill names with Unicode NFKC, case folding, whitespace trimming and collapsing.
2. Take the maximum saved proficiency for that skill, preventing duplicate entries from inflating coverage.
3. Compute `min(current proficiency / required proficiency, 1)`; absent skills contribute zero.
4. Average the contributions and multiply by 100, rounded to the nearest whole number.

All requirements have equal weight in the score. Priority labels order learning recommendations but do not imply statistically estimated importance. Self-reported proficiency is not independently assessed. Location, budget, experience and interests are planning context, not hidden score multipliers.

Digital twin calculations use a separate hypothetical skills array. They never overwrite the saved profile. Course completion is a local checklist, not proof of skill acquisition.

## Integration seam

`src/domain/types.ts` defines `WorkforceService`, profiles, evidence, assessments, market observations, simulation and roadmap interfaces.

`demoService` in `src/domain/services.ts` implements that service with local deterministic data. Future Express implementations can use `createApiWorkforceService()` with explicitly injected generated-client operations. No speculative API endpoint is called now. Capability flags determine whether live market refresh or CV processing is available; the demo has neither.

For the later backend milestone:

1. Agree API contracts and regenerate the workspace API client.
2. Map generated client responses to the typed service interfaces.
3. Supply real provenance, observation dates, uncertainty and verified resource URLs.
4. Retain visible loading, empty, error and retry states.
5. Do not silently fall back from a failed live API to synthetic results.

## Local storage

The versioned demo workspace keeps each audience's profile and target role separately. Completion keys include audience and role/skill. Defensive parsing validates profiles and restores defaults only for invalid parts. Blocked or full browser storage produces a visible warning. Existing legacy storage keys are not deleted.

Only fictional demo information should be entered for hackathon demonstrations. There is no account sync; browser-local data can be cleared by the browser. Resetting one audience must not reset other audiences or legacy data.

## Verification

From the workspace root:

```sh
pnpm --filter @workspace/future-ready-workforce typecheck
pnpm --filter @workspace/api-server exec tsx --test ../future-ready-workforce/src/domain/domain.test.ts
PORT=22019 BASE_PATH=/ pnpm --filter @workspace/future-ready-workforce build
```

The test runner is already installed in the workspace; running these tests does not change the Express backend.
