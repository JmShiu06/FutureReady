# Controlled GLM Learning Roadmap integration test

## Scope and outcome

One explicitly authorized live explanation was submitted through the browser using
`POST /api/ai/explanations` with exactly:

```json
{"feature":"learning-roadmap","sampleId":"data-starter"}
```

The API returned HTTP 200, `provider.id: "glm"`, `synthetic: true`,
`finalAnswerOnly: true`, a nonempty explanation and validated evidence.
The existing explanation panel displayed GLM-5.3.
One separate mocked response checked the UI before the live attempt; it made no provider call.
No live retries or additional explanation requests were made.

The server prepared fictional Python, Excel and data-visualization skills,
Data Analyst / BI skill overlap (3 of 30, 10%, not a hiring probability),
missing skills, four weekly study hours, RM 0 budget and eligible catalogue resources.
The returned explanation referenced the Microsoft Learn Introduction to Transact-SQL
record (`microsoft-introduction-to-transact-sql`); its URL and catalogue facts were
resolved and validated by the backend rather than accepted from model text.

The prepared synthetic context, deterministic match, evidence and eligible resource
records were serialized before and after the request and compared byte-for-byte:
unchanged. No CV, saved personal profile, scores or catalogue records were modified.
Outbound context was established from the server preparation/adapter path and
the matching response summaries; credentials and upstream request headers were not captured.
This test did not independently measure billing or upstream token usage.

## Safeguards and cleanup

- GLM was selected only with a temporary development `AI_PROVIDER=glm` override.
- The development-only page used the existing panel with a session-level single-attempt guard.
- The browser also blocked additional live explanation requests.
- The temporary page and panel guard were removed after the test.
- The development override was deleted, the API restarted and its health check passed.
- With `AI_PROVIDER` unset, Qwen is again the active default.
- No shared or production provider configuration was changed.

## Restoration procedure for future controlled tests

Delete the development-only `AI_PROVIDER` override and restart
`artifacts/api-server: API Server`. Verify the setting is absent (including any
shared override) and request `/api/healthz`, not an AI endpoint.
If an override existed before a future test, restore that original value instead.
Do not issue a paid Qwen request merely to verify restoration.

## Offline reproducibility

`pnpm --filter @workspace/api-server exec tsx scripts/roadmap-baseline.ts`
prepares synthetic backend context and validates a mocked resource-reference
answer without contacting RunPod. Frontend typecheck passed after cleanup.

The temporary route was not part of normal navigation and showed the shell's
“Not found” breadcrumb during the test; this did not affect the result.
