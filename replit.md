# FutureReady

FutureReady helps users explore career options, understand skill gaps, and plan learning pathways using occupation references and labour-market data.

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
- CV files are sent to the API for local extraction/OCR. Users review the extracted skill names before adding them to their browser-local profile. Raw CV content is not sent to the language model.
- Optional AI explanations use the server-side `RUNPOD_LLM_API_KEY`, `RUNPOD_LLM_BASE_URL` and `RUNPOD_LLM_MODEL` settings. Keep credentials in Replit Secrets, never in source or public configuration.
- An unused credential-shaped RunPod setting was removed from `.replit` on 2026-10-24. It was tracked previously: rotate the associated RunPod credential. Git history was not rewritten, so the old value may remain in past commits.
- Verification on 2026-10-24: all 175 API tests and 98 frontend domain tests passed, along with the full workspace TypeScript check and production web build. The former job-fit failures came from an unbound provider method, not a missing catalogue or API key. The domain test command handles CSS and automatic JSX, and renders translated components with their required provider. These offline/mocked results do not prove live model generation works.

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
- Job overlap uses skills saved in the current device profile. CV skills are extracted by the API and added only after the user reviews them; the uploaded document is not retained as profile content.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
