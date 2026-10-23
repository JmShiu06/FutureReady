# Saved pathway regression tests

Run from the workspace root:

```sh
pnpm --filter @workspace/future-ready-workforce run test:saved-pathway
```

Start the existing `artifacts/future-ready-workforce: web` workflow first.
The suite uses the existing Playwright configuration and defaults to the local
preview proxy at `http://localhost:80`. No API server, database, credentials,
real CVs, or paid services are required.

For another running preview or Chromium installation:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:80 \
PLAYWRIGHT_CHROMIUM_PATH=/repl/tools/bin/chromium \
pnpm --filter @workspace/future-ready-workforce run test:saved-pathway
```

## Coverage

- Each of the three sample presets creates a separate starting baseline without
  replacing an existing, non-empty synthetic saved skill profile.
- One communication course completes all three covered milestones, counts as
  one completed step, and survives reload with its completion timestamps.
  Unchecking clears all three milestones and timestamps.
- Hours, budget, and free-only preferences survive reload and affect the displayed
  weekly schedule.
- Both scenario changes and mocked DOSM priority changes leave accepted ordering
  and displayed priorities unchanged until reviewed, including through reload.
- **Keep current order** persists the ignored update and keeps the accepted plan.
- **Apply updates** persists the new accepted inputs and displayed priorities;
  the scenario fixture also produces an actual core-step reorder.
- Both review choices retain completed milestones, timestamps, the starting
  baseline, and saved profile without silently confirming new skill levels.

## Isolation and safety

Each test receives Playwright's fresh browser context. The fixture seeds only
synthetic local storage, once per context, so reloads test the app's actual saved
state rather than reseeding it. The occupation fixture is explicitly fictional;
its O*NET-shaped URL satisfies the saved-snapshot validator but is never visited.
Course links are never opened.

All API requests are intercepted. Only synthetic occupation matching and the
read-only DOSM insights route receive local fixture responses. Unexpected APIs
(including generation, CV uploads, refreshes, or other mutations) are aborted
and fail the test during teardown. External requests are blocked; optional
fonts/assets are ignored, while external fetch/XHR calls fail the test.
Service workers are disabled to prevent bypassing interception. No request is
forwarded to live DOSM or a model provider.

The tests use existing scoring unchanged; they do not import or replace its
implementation. The mutable DOSM fixture changes only subsequent mocked GET
responses in that test context.

Results use the existing temporary output directory
`/tmp/future-ready-workforce-playwright-results`, outside Git.
