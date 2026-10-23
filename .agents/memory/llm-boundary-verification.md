---
name: LLM boundary verification
description: Verify feature prompts through shared provider preflight, not only mocked route providers.
---

When revising AI prompts, test the complete preparation-to-provider-to-validation path with a mocked network transport. Mocking the entire provider at the route boundary is not sufficient.

**Why:** A richer CV prompt passed route and output tests but exceeded the shared provider's input guard, so actual requests failed before reaching RunPod. A healthy model-list endpoint alone does not verify generation or output compatibility.

**How to apply:** Preserve shared bounds and privacy safeguards. Exercise actual preflight and response cleanup with fictional inputs, then distinguish those offline results from live end-to-end verification. If generation is prohibited, obtain approval before a live synthetic request; never use real CV data merely to debug connectivity.

Treat harmless presentation differences separately from unsafe evidence claims. A partial result must explicitly identify withheld sections, never present replacement status text as AI analysis.

**Why:** A completed live response used inline career labels instead of separate paragraphs, while also overstating what skill names and pooled references establish. Formatting tolerance is appropriate; accepting unsupported claims to avoid an error is not.

**How to apply:** Normalise labels and whitespace without rewriting claims. Preserve validated sections and authoritative reference evidence, visibly label omissions, and fail when no usable analysis remains. Reuse captured fictional output for offline diagnosis rather than spending additional generation requests without approval.
