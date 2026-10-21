---
name: Python CPU package sources
description: Environment-specific dependency resolver behavior seen when adding sentence transformers.
---

Replit's publish-time Python resolver can expose different candidate versions from a locally cached lock. Keep CPU PyTorch indexes explicit and scoped to packages they actually host, but do not assume an explicit PyPI default alone repairs publication.

**Why:** An explicit PyPI default and successful local sync did not prevent a later publish build from rejecting the entire requested major-version range. Local installation success was insufficient evidence that the publish blocker was repaired.

**How to apply:** Inspect the newest publish log, then compare available compatible majors using fresh dependency resolution. Check the latest minor release rather than inferring a whole major's requirements from its first release. Prefer the option that preserves existing transitive dependencies, regenerate the lock normally, run a real sync and the pinned model's embedding smoke test, and distinguish local verification from a successful publish. Preserve the managed Python environment rather than creating another virtual environment.
