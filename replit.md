# FutureReady Workforce

A skills intelligence demo for exploring career matches, learning paths, workforce trends, and team reskilling plans.

## Run & Operate

- Install the workspace dependencies with `pnpm install --frozen-lockfile`.
- Start the existing `artifacts/future-ready-workforce: web` workflow for the web preview at `/`. It runs `pnpm --filter @workspace/future-ready-workforce run dev` and supplies the required `PORT` and `BASE_PATH`; do not run this command without those workflow-provided variables.
- `pnpm --filter @workspace/future-ready-workforce run typecheck` — check the web app.
- The current web demo uses browser-local storage and does not require a database or API server.
- Start the existing `artifacts/api-server: API Server` workflow if the API is needed; its managed configuration supplies the port.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Database tooling requires `DATABASE_URL` — Postgres connection string (not needed for the current web demo).

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
