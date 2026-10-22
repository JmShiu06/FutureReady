# FutureReady Workforce

A skills intelligence demo for exploring career matches, learning paths, workforce trends, and team reskilling plans.

## Run & Operate

- Install the workspace dependencies with `pnpm install --frozen-lockfile`.
- Start the existing `artifacts/future-ready-workforce: web` workflow for the web preview at `/`. It runs `pnpm --filter @workspace/future-ready-workforce run dev` and supplies the required `PORT` and `BASE_PATH`; do not run this command without those workflow-provided variables.
- `pnpm --filter @workspace/future-ready-workforce run typecheck` — check the web app.
- Most profile data remains in browser-local storage. The Job Search page also requires the existing `artifacts/api-server: API Server` workflow and uses explicitly labeled sample listings; no database is required.
- Run API tests with `pnpm --filter @workspace/api-server run test`.
- Job-source integration points live in `artifacts/api-server/src/services/job_provider.ts`. The current source is demo data; no public job API has been selected or connected.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Database tooling requires `DATABASE_URL` — Postgres connection string (not needed for the current web demo).

### Imported project setup

- The existing artifact definitions register the managed workflows above. Run both the web and API workflows for the application; the optional Canvas preview server is not needed.
- Verified the dashboard renders at `/` and `/api/healthz` and `/api/jobs` return HTTP 200.
- The imported code has existing CV-related TypeScript errors in both web and API packages. API tests currently report 132 passing and 5 failing; these failures concern CV catalogue/explanation contracts, not server startup.
- Optional AI explanations require `RUNPOD_LLM_API_KEY` in Secrets and `RUNPOD_LLM_BASE_URL` set to the user's HTTPS OpenAI-compatible RunPod endpoint. The required API-key secret is not configured; core demo features can run without it. Do not reuse credential-like values from committed configuration.
- A credential-like value was found in plain-text imported configuration. Rotate it with the provider and remove it from tracked configuration/history as a separate security follow-up; never copy it into documentation or logs.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/future-ready-workforce/src/App.tsx` — top-level routes and persistent navigation.
- `artifacts/future-ready-workforce/src/components/job-search-page.tsx` and `job-details-page.tsx` — job search and details UI.
- `artifacts/api-server/src/services/job_provider.ts` — provider contract and current demo source.
- `lib/api-spec/openapi.yaml` — API source of truth; regenerate clients with the codegen command above.
- `artifacts/future-ready-workforce/src/index.css` and `src/components/job-search.css` — app theme and job-search styling.

## Architecture decisions

- Job-source data access stays behind `JobProvider` in `services/job_provider.ts`; replace that adapter when a public job API is supplied, without adding provider-specific calls to routes or frontend code.
- Current jobs are fictional preview records with `externalUrl: null`; do not present them as live vacancies or invent application destinations.
- Job overlap uses skills saved in the current device profile. The app does not extract skills from uploaded CV files; its existing CV picker is local-only.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
