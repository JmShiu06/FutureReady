---
name: Learning recommendation boundaries
description: Scope and trust boundaries for dataset-based learning recommendations.
---

The skill-learning backend consumes existing analysis rather than rebuilding the CV or skill-analysis engine. Use the uploaded course dataset as the recommendation reference. Do not silently substitute keyword matching for the explicitly requested semantic-search stack.

**Why:** ChewWen explicitly asked to implement the uploaded backend specification line by line and use the accompanying dataset. That request authorizes this learning backend despite the earlier frontend-only phase; it does not authorize unrelated backend expansion.

**How to apply:** Keep new learning suggestions separate from CV extraction and saved proficiency. Course ranking scores are not hiring probabilities or verified skill scores.

Uploaded course references must remain distinct from the independently checked learning-resource library. A source rating, level, URL or certificate label is not proof of current availability or an awarded certification.

**Why:** The supplied archive is reference material, not a provider verification process; existing verified resources have a stronger trust claim.

**How to apply:** Label dataset limitations and planning assumptions. Do not replace verified resources with unverified catalog matches or save request analysis just because a caller supplies a user identifier.
