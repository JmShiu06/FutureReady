# Backend AI providers

## Configuration

Qwen remains the default. Adding `GLM_API_KEY` alone does **not** select GLM.

| Server setting | Purpose |
| --- | --- |
| `AI_PROVIDER` unset, blank, or `qwen` | Existing Qwen OpenAI-compatible client |
| `AI_PROVIDER=glm` | Explicitly select the GLM queue adapter |
| `GLM_API_KEY` | Existing server-only GLM secret; required only for GLM |
| `RUNPOD_LLM_BASE_URL`, `RUNPOD_LLM_API_KEY`, `RUNPOD_LLM_MODEL` | Unchanged Qwen configuration |

An unknown provider fails explicitly. No fallback to another provider occurs. Apply configuration through workspace environment settings, then restart the API service. Never put credentials in browser settings, source files or request bodies.

GLM endpoint and model are fixed server-side:

- `POST https://api.runpod.ai/v2/b1dd8hy2hqo1nb/run`
- Request model: `glm-5.3` (the supplied response reports `zai-org/GLM-5.3`)
- Messages, `sampling_params`, `model`, and `"reasoning-effort": "low"` are nested inside `input`.
- Production sampling retains temperature `0.2` and the application's bounded token budget (600 by default, 4000 maximum). The Playground's temperature/token examples are not required values.
- Completed content comes from `output[0].result.choices[0].message.content`, not a top-level OpenAI response.

The adapter accepts immediate `COMPLETED` responses and polls queued jobs using `GET /status/{id}`. Poll intervals grow from 500 ms to a maximum of four seconds. The entire GLM operation has a 45-second deadline, followed, when necessary, by at most a 1.5-second best-effort cancellation request. Server-owned execution/TTL policies additionally bound orphaned work. A known job is cancelled on deadline, disconnect or an unusable polling result. Failed cancellation cannot guarantee the job stopped.

Job IDs, statuses, HTTP responses and bounded output structures are validated. Final-answer-only validation rejects reasoning, empty output, truncation and unsupported finish reasons. Feature-specific JSON schemas and source/reference checks still apply. JSON mode relies on existing schema instructions; no undocumented worker `response_format` is assumed. Strict validation can reject otherwise successful generations.

There are no automatic submission retries or provider fallbacks. In particular, a network timeout can occur after RunPod accepted and billed a submission; without its job ID the application cannot safely cancel it. A new user-requested attempt may incur another charge.

## Privacy and unchanged behaviour

GLM is initially restricted to server-prepared synthetic/demo contexts. The single detected CV skill and the reviewed CV career explanation are refused with HTTP 403 **before any GLM request**, even if the user previously consented to Qwen. Raw CVs, personal profiles and saved learning history are not authorized for GLM. No browser provider picker is added.

Qwen's existing CV consent/review flow stays unchanged when Qwen is selected. Selecting GLM intentionally makes those CV AI explanation actions unavailable; local CV parsing, deterministic matching and profile/roadmap state are unaffected.

Request schemas, output envelopes, no-store headers, eight requests per client per minute, thirty global requests per minute, two active requests and shared in-flight deduplication remain in force. Disconnecting one subscriber does not cancel a synthetic request another subscriber still needs. No prompts, responses or keys are logged by the new adapter.

The application does not store GLM outputs persistently. However, RunPod documents **30-minute availability of completed `/run` results**. Application `no-store` headers do not remove upstream retention. Personal-data use requires a separate review of provider retention, consent and data flow.

## Grounding inventory and limits

Both providers explain existing results; they do not compute replacements.

| Feature | Supplied context / limitation |
| --- | --- |
| Career Explorer | Fictional learner's existing matches/gaps and bounded occupation evidence; not the actual saved profile or hiring probability |
| Learning Roadmap | Fictional gaps/study constraints and existing catalogue resource IDs; not the user's saved roadmap or learning history |
| Digital Twin / scenario examples | Fictional before/after skill confirmations and authored adoption assumptions; no validated forecasts or calculated effect sizes |
| Task support | Fictional work traits, not real self-check responses or a validated exposure model |
| Skills Radar | Dated DOSM national observations, qualitative directions and stale-state metadata; not real-time occupation vacancies or skill demand |
| Job fit | Existing listing requirements compared with a fictional learner; demo listings are not verified vacancies |
| SDG explanations | Existing source-supported thematic mappings only; not measured impact or official occupational classifications |
| Profile suggestions | Existing dataset gaps for fictional backgrounds; every profile addition still requires user confirmation |
| CV skill / reviewed CV explanation | Existing Qwen-only flows; explicitly blocked for GLM |

The shared AI request path is `/api/ai/explanations`; reviewed CV career explanations have their own `/api/ai/cv-career-explanation` route. A shared provider does not make every deterministic page LLM-powered. Exact figures, dates, citations, resource URLs, career scores and calculations remain server-owned. Missing sources, resources, vacancies or forecasts must not be fabricated.

## Offline verification and manual smoke test

Automated tests inject mock fetchers and synthetic values; they do not use RunPod credits:

```sh
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server typecheck
```

A separate live smoke-test command exists, but **has not been authorized or run as part of this integration**. It is not part of tests, builds or startup. Running it without the authorization flag exits before contacting RunPod.

Only after explicit approval for a paid test:

```sh
pnpm --filter @workspace/api-server smoke:glm --authorize-paid-request
```

This sends one harmless synthetic prompt, forces GLM for that command only without changing the configured default, and checks for exactly `GLM connection test successful.`. It logs only a fixed success/failure message, never response details or credentials. Queue status polls and best-effort cancellation may follow the single submission.

The supplied Playground result confirms the worker contract, **not live connectivity from this application**. Cold starts can exceed the UI-compatible deadline. Supporting long-lived jobs would require a separately approved API/UI change.

Reference: https://docs.runpod.io/serverless/endpoints/send-requests
